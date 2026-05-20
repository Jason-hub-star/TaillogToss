import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { fetchAlbumPhotos } from '@apps-in-toss/framework';
import { DogPhotoPicker } from './DogPhotoPicker';

jest.mock('@apps-in-toss/framework', () => ({
  FetchAlbumPhotosPermissionError: class FetchAlbumPhotosPermissionError extends Error {
    constructor() {
      super('사진첩 권한이 거부되었어요.');
    }
  },
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
    mockFetchAlbumPhotos.getPermission.mockResolvedValue('allowed');
    mockFetchAlbumPhotos.openPermissionDialog.mockResolvedValue('allowed');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('checks permission and returns a preview-ready base64 data uri', async () => {
    const onSelect = jest.fn();
    mockFetchAlbumPhotos.mockResolvedValueOnce([{ id: 'photo-1', dataUri: 'abc123' }]);

    const { getByText } = render(<DogPhotoPicker onSelect={onSelect} />);

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('data:image/jpeg;base64,abc123');
    });

    expect(mockFetchAlbumPhotos.getPermission).toHaveBeenCalledTimes(1);
    expect(mockFetchAlbumPhotos.openPermissionDialog).not.toHaveBeenCalled();
    expect(mockFetchAlbumPhotos).toHaveBeenCalledWith({
      base64: true,
      maxCount: 2,
      maxWidth: 720,
    });
  });

  it('still tries the album request after the host permission dialog returns denied', async () => {
    const onSelect = jest.fn();
    mockFetchAlbumPhotos.getPermission.mockResolvedValueOnce('denied');
    mockFetchAlbumPhotos.openPermissionDialog.mockResolvedValueOnce('denied');
    mockFetchAlbumPhotos.mockResolvedValueOnce([{ id: 'photo-3', dataUri: 'retry-base64' }]);

    const { getByText } = render(<DogPhotoPicker onSelect={onSelect} />);

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('data:image/jpeg;base64,retry-base64');
    });

    expect(mockFetchAlbumPhotos.openPermissionDialog).toHaveBeenCalledTimes(1);
  });

  it('retries with a file uri strategy when the first album option fails', async () => {
    const onSelect = jest.fn();
    mockFetchAlbumPhotos
      .mockRejectedValueOnce(new Error('Max items must be higher than 1'))
      .mockResolvedValueOnce([{ id: 'photo-2', dataUri: 'file:///tmp/dog.jpg' }]);

    const { getByText } = render(<DogPhotoPicker onSelect={onSelect} />);

    fireEvent.press(getByText('+'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('file:///tmp/dog.jpg');
    });

    expect(mockFetchAlbumPhotos).toHaveBeenNthCalledWith(2, {
      base64: false,
      maxCount: 2,
      maxWidth: 1024,
    });
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
    mockFetchAlbumPhotos.getPermission.mockResolvedValueOnce('denied');
    mockFetchAlbumPhotos.openPermissionDialog.mockResolvedValueOnce('denied');
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
