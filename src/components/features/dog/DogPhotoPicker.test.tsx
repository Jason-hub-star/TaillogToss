import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { DogPhotoPicker } from './DogPhotoPicker';

jest.mock('@apps-in-toss/native-modules', () => ({
  fetchAlbumPhotos: Object.assign(jest.fn(), {
    getPermission: jest.fn(),
    openPermissionDialog: jest.fn(),
  }),
}));

jest.mock('lib/data/iconSources', () => ({
  ICONS: {
    'ic-dog': 'data:image/png;base64,test',
  },
}));

const mockFetchAlbumPhotos = fetchAlbumPhotos as jest.Mock & {
  getPermission: jest.Mock;
  openPermissionDialog: jest.Mock;
};

describe('DogPhotoPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses fetchAlbumPhotos directly so the permission sheet is not requested twice', async () => {
    const onSelect = jest.fn();
    mockFetchAlbumPhotos.mockResolvedValueOnce([{ id: 'photo-1', dataUri: 'file:///tmp/dog.jpg' }]);

    const { getByText } = render(<DogPhotoPicker onSelect={onSelect} />);

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('file:///tmp/dog.jpg');
    });

    expect(mockFetchAlbumPhotos).toHaveBeenCalledWith({
      base64: false,
      maxCount: 1,
      maxWidth: 1024,
    });
    expect(mockFetchAlbumPhotos.getPermission).not.toHaveBeenCalled();
    expect(mockFetchAlbumPhotos.openPermissionDialog).not.toHaveBeenCalled();
  });

  it('does not show a failure alert when the user closes the picker without choosing a photo', async () => {
    mockFetchAlbumPhotos.mockResolvedValueOnce([]);

    const { getByText } = render(<DogPhotoPicker onSelect={jest.fn()} />);

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(mockFetchAlbumPhotos).toHaveBeenCalledTimes(1);
    });

    expect(Alert.alert).not.toHaveBeenCalledWith('사진 선택 실패', expect.any(String));
  });

  it('offers a development fallback photo when the sandbox host cannot grant album permission', async () => {
    const onSelect = jest.fn();
    mockFetchAlbumPhotos.mockRejectedValueOnce(new Error('Permission denied'));

    const { getByText } = render(<DogPhotoPicker onSelect={onSelect} />);

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        '개발용 사진 선택 제한',
        expect.any(String),
        expect.any(Array),
      );
    });

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons[1].onPress();

    expect(onSelect).toHaveBeenCalledWith('data:image/png;base64,test');
  });
});
