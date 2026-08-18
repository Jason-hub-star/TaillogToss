"""
B2B organization access boundary tests.
Parity: B2B-001
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from app.core.exceptions import BadRequestException, ForbiddenException
from app.features.org import schemas, service
from app.shared.models import Dog, DogAssignment, OrgDog, OrgDogPii, OrgMember, OrgSubscription


ORG_ID = UUID("33333333-3333-3333-3333-333333333333")
ACTOR_ID = UUID("11111111-1111-1111-1111-111111111111")
INVITEE_ID = UUID("22222222-2222-2222-2222-222222222222")


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDb:
    def __init__(self, membership=None, results=None):
        self.membership = membership
        self.results = list(results or [])
        self.add = MagicMock()
        self.commit = AsyncMock()

    async def execute(self, _query):
        if self.results:
            return ScalarResult(self.results.pop(0))
        return ScalarResult(self.membership)

    async def flush(self):
        for call in self.add.call_args_list:
            instance = call.args[0]
            if not getattr(instance, "id", None):
                instance.id = uuid4()

    async def refresh(self, instance):
        if not getattr(instance, "id", None):
            instance.id = uuid4()
        instance.status = "pending"
        if not getattr(instance, "enrolled_at", None):
            instance.enrolled_at = datetime.now(timezone.utc)
        if not getattr(instance, "assigned_at", None):
            instance.assigned_at = datetime.now(timezone.utc)
        instance.invited_at = datetime.now(timezone.utc)
        instance.accepted_at = None


def _member(role: str, status: str = "active") -> OrgMember:
    return OrgMember(
        id=uuid4(),
        org_id=ORG_ID,
        user_id=ACTOR_ID,
        role=role,
        status=status,
        invited_at=datetime.now(timezone.utc),
        accepted_at=None,
    )


def _assignment(trainer_user_id: UUID = INVITEE_ID, org_id: UUID | None = ORG_ID) -> DogAssignment:
    return DogAssignment(
        id=uuid4(),
        dog_id=UUID("44444444-4444-4444-4444-444444444444"),
        org_id=org_id,
        trainer_user_id=trainer_user_id,
        role="primary",
        assigned_at=datetime.now(timezone.utc),
        ended_at=None,
        status="active",
    )


def _org_subscription(
    org_id: UUID | None = ORG_ID,
    trainer_user_id: UUID | None = None,
) -> OrgSubscription:
    return OrgSubscription(
        id=uuid4(),
        org_id=org_id,
        trainer_user_id=trainer_user_id,
        plan_type="center_basic" if org_id else "trainer_10",
        toss_order_id="order-1",
        price_krw=1000,
        max_dogs=30,
        max_staff=5 if org_id else 1,
        billing_cycle="monthly",
        started_at=datetime.now(timezone.utc),
        expires_at=None,
        cancelled_at=None,
        refunded_at=None,
        suspend_reason=None,
        retry_count=0,
        status="active",
        created_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
async def test_pending_org_member_cannot_pass_membership_boundary():
    db = FakeDb(membership=_member("staff", status="pending"))

    with pytest.raises(ForbiddenException):
        await service.verify_org_membership(db, ORG_ID, str(ACTOR_ID))


@pytest.mark.asyncio
async def test_staff_member_cannot_invite_org_members():
    db = FakeDb(membership=_member("staff"))

    with pytest.raises(ForbiddenException):
        await service.invite_member(
            db,
            str(ACTOR_ID),
            schemas.InviteMemberRequest(
                org_id=str(ORG_ID),
                user_id=str(INVITEE_ID),
                role="viewer",
            ),
        )

    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_manager_member_can_invite_org_members():
    db = FakeDb(membership=_member("manager"))

    response = await service.invite_member(
        db,
        str(ACTOR_ID),
        schemas.InviteMemberRequest(
            org_id=str(ORG_ID),
            user_id=str(INVITEE_ID),
            role="viewer",
        ),
    )

    invited = db.add.call_args.args[0]
    assert isinstance(invited, OrgMember)
    assert invited.org_id == ORG_ID
    assert invited.user_id == INVITEE_ID
    assert invited.role == "viewer"
    assert response.status == "pending"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_manager_member_cannot_invite_manager_or_owner_roles():
    db = FakeDb(membership=_member("manager"))

    for role in ["manager", "owner"]:
        with pytest.raises(ForbiddenException):
            await service.invite_member(
                db,
                str(ACTOR_ID),
                schemas.InviteMemberRequest(
                    org_id=str(ORG_ID),
                    user_id=str(INVITEE_ID),
                    role=role,
                ),
            )

    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_owner_member_can_invite_manager_role():
    db = FakeDb(membership=_member("owner"))

    response = await service.invite_member(
        db,
        str(ACTOR_ID),
        schemas.InviteMemberRequest(
            org_id=str(ORG_ID),
            user_id=str(INVITEE_ID),
            role="manager",
        ),
    )

    invited = db.add.call_args.args[0]
    assert invited.role == "manager"
    assert response.status == "pending"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_invite_member_rejects_unknown_role():
    db = FakeDb(membership=_member("owner"))

    with pytest.raises(BadRequestException):
        await service.invite_member(
            db,
            str(ACTOR_ID),
            schemas.InviteMemberRequest(
                org_id=str(ORG_ID),
                user_id=str(INVITEE_ID),
                role="service_role",
            ),
        )

    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_enroll_dog_writes_parent_last4_and_pii_server_side(monkeypatch):
    db = FakeDb(membership=_member("manager"))
    dog_id = UUID("44444444-4444-4444-4444-444444444444")
    verify = AsyncMock()

    monkeypatch.setattr(service, "verify_dog_ownership", verify)
    response = await service.enroll_dog(
        db,
        str(ACTOR_ID),
        schemas.EnrollDogRequest(
            org_id=str(ORG_ID),
            dog_id=str(dog_id),
            parent_name="guardian",
            parent_phone_last4="1234",
            parent_phone_enc="encrypted-phone",
        ),
    )

    org_dog = db.add.call_args_list[0].args[0]
    pii = db.add.call_args_list[1].args[0]
    verify.assert_awaited_once_with(db, dog_id, user_id=str(ACTOR_ID))
    assert org_dog.org_id == ORG_ID
    assert org_dog.dog_id == dog_id
    assert org_dog.parent_phone_last4 == "1234"
    assert pii.org_dog_id == org_dog.id
    assert pii.parent_phone_enc == b"encrypted-phone"
    assert response.parent_phone_last4 == "1234"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_enroll_dog_rejects_foreign_dog_before_org_link(monkeypatch):
    db = FakeDb(membership=_member("manager"))
    dog_id = UUID("44444444-4444-4444-4444-444444444444")
    verify = AsyncMock(side_effect=ForbiddenException("Dog not owned by user"))
    monkeypatch.setattr(service, "verify_dog_ownership", verify)

    with pytest.raises(ForbiddenException):
        await service.enroll_dog(
            db,
            str(ACTOR_ID),
            schemas.EnrollDogRequest(
                org_id=str(ORG_ID),
                dog_id=str(dog_id),
                parent_name="guardian",
            ),
        )

    verify.assert_awaited_once_with(db, dog_id, user_id=str(ACTOR_ID))
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_org_dog_uses_authenticated_actor_and_writes_pii_server_side():
    db = FakeDb(membership=_member("manager"))

    response = await service.create_org_dog(
        db,
        str(ACTOR_ID),
        schemas.CreateOrgDogRequest(
            org_id=str(ORG_ID),
            dog_name="  Maple  ",
            dog_breed=" Poodle ",
            dog_sex="FEMALE",
            parent_name=" guardian ",
            parent_phone="010-1234-5678",
            parent_address=" Seoul ",
            vet_name=" Vet ",
            animal_reg_no=" 410000000000001 ",
            group_tag=" A ",
        ),
    )

    dog = db.add.call_args_list[0].args[0]
    org_dog = db.add.call_args_list[1].args[0]
    pii = db.add.call_args_list[2].args[0]
    assert isinstance(dog, Dog)
    assert isinstance(org_dog, OrgDog)
    assert isinstance(pii, OrgDogPii)
    assert dog.user_id == ACTOR_ID
    assert dog.name == "Maple"
    assert dog.breed == "Poodle"
    assert dog.parent_address == "Seoul"
    assert dog.vet_name == "Vet"
    assert dog.animal_reg_no == "410000000000001"
    assert org_dog.org_id == ORG_ID
    assert org_dog.dog_id == dog.id
    assert org_dog.parent_name == "guardian"
    assert org_dog.parent_phone_last4 == "5678"
    assert org_dog.group_tag == "A"
    assert pii.org_dog_id == org_dog.id
    assert pii.parent_phone_enc == b"MDEwMTIzNDU2Nzg="
    assert response.dog_id == dog.id
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_manager_can_assign_active_org_dog_to_active_org_trainer():
    db = FakeDb(results=[_member("manager"), object(), _member("trainer")])

    response = await service.assign_dog(
        db,
        str(ACTOR_ID),
        schemas.AssignDogRequest(
            org_id=str(ORG_ID),
            dog_id="44444444-4444-4444-4444-444444444444",
            trainer_user_id=str(INVITEE_ID),
            role="primary",
        ),
    )

    assignment = db.add.call_args.args[0]
    assert assignment.org_id == ORG_ID
    assert assignment.trainer_user_id == INVITEE_ID
    assert response.status == "pending"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_manager_cannot_assign_org_dog_to_non_member_trainer():
    db = FakeDb(results=[_member("manager"), object(), None])

    with pytest.raises(ForbiddenException):
        await service.assign_dog(
            db,
            str(ACTOR_ID),
            schemas.AssignDogRequest(
                org_id=str(ORG_ID),
                dog_id="44444444-4444-4444-4444-444444444444",
                trainer_user_id=str(INVITEE_ID),
                role="primary",
            ),
        )

    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_org_subscription_requires_active_org_membership():
    db = FakeDb(results=[None])

    with pytest.raises(ForbiddenException):
        await service.get_current_org_subscription(db, ORG_ID, str(ACTOR_ID))

    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_org_subscription_returns_only_after_membership_check():
    subscription = _org_subscription()
    db = FakeDb(results=[_member("staff"), subscription])

    response = await service.get_current_org_subscription(db, ORG_ID, str(ACTOR_ID))

    assert response is not None
    assert response.id == subscription.id
    assert response.org_id == ORG_ID
    assert response.trainer_user_id is None
    assert response.status == "active"
    assert response.max_dogs == 30
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_trainer_subscription_is_bound_to_authenticated_user():
    subscription = _org_subscription(org_id=None, trainer_user_id=ACTOR_ID)
    db = FakeDb(results=[subscription])

    response = await service.get_current_trainer_subscription(db, str(ACTOR_ID))

    assert response is not None
    assert response.trainer_user_id == ACTOR_ID
    assert response.org_id is None
    assert response.plan_type == "trainer_10"
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_personal_assignment_cannot_target_another_trainer(monkeypatch):
    verify_dog = AsyncMock()
    monkeypatch.setattr(service, "verify_dog_ownership", verify_dog)
    db = FakeDb()

    with pytest.raises(ForbiddenException):
        await service.assign_dog(
            db,
            str(ACTOR_ID),
            schemas.AssignDogRequest(
                dog_id="44444444-4444-4444-4444-444444444444",
                trainer_user_id=str(INVITEE_ID),
                role="primary",
            ),
        )

    verify_dog.assert_not_awaited()
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_personal_assignment_requires_dog_access(monkeypatch):
    verify_dog = AsyncMock()
    monkeypatch.setattr(service, "verify_dog_ownership", verify_dog)
    db = FakeDb()

    await service.assign_dog(
        db,
        str(ACTOR_ID),
        schemas.AssignDogRequest(
            dog_id="44444444-4444-4444-4444-444444444444",
            trainer_user_id=str(ACTOR_ID),
            role="primary",
        ),
    )

    verify_dog.assert_awaited_once()
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_staff_member_cannot_unassign_another_org_trainer():
    db = FakeDb(results=[_member("staff")])

    with pytest.raises(ForbiddenException):
        await service.unassign_dog(
            db,
            str(ACTOR_ID),
            schemas.UnassignDogRequest(
                org_id=str(ORG_ID),
                dog_id="44444444-4444-4444-4444-444444444444",
                trainer_user_id=str(INVITEE_ID),
            ),
        )

    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_staff_member_can_unassign_own_org_assignment():
    assignment = _assignment(trainer_user_id=ACTOR_ID)
    db = FakeDb(results=[_member("staff"), object(), assignment])

    await service.unassign_dog(
        db,
        str(ACTOR_ID),
        schemas.UnassignDogRequest(
            org_id=str(ORG_ID),
            dog_id="44444444-4444-4444-4444-444444444444",
            trainer_user_id=str(ACTOR_ID),
        ),
    )

    assert assignment.status == "ended"
    assert assignment.ended_at is not None
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_manager_member_can_unassign_org_assignment_for_trainer():
    assignment = _assignment(trainer_user_id=INVITEE_ID)
    db = FakeDb(results=[_member("manager"), object(), assignment])

    await service.unassign_dog(
        db,
        str(ACTOR_ID),
        schemas.UnassignDogRequest(
            org_id=str(ORG_ID),
            dog_id="44444444-4444-4444-4444-444444444444",
            trainer_user_id=str(INVITEE_ID),
        ),
    )

    assert assignment.status == "ended"
    assert assignment.ended_at is not None
    db.commit.assert_awaited_once()
