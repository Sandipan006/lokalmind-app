import { USER_AVATAR_COUNT } from '@/src/core/constants/userAvatarCount';
import type { ImageSourcePropType } from 'react-native';

const AVATAR_SOURCES: ImageSourcePropType[] = [
  require('@/src/features/profile/assets/images/avatars/user-avatar-01.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-02.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-03.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-04.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-05.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-06.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-07.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-08.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-09.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-10.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-11.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-12.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-13.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-14.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-15.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-16.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-17.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-18.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-19.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-20.png'),
  require('@/src/features/profile/assets/images/avatars/user-avatar-21.png'),
];

if (__DEV__ && AVATAR_SOURCES.length !== USER_AVATAR_COUNT) {
  throw new Error(
    `userAvatarSources: expected ${USER_AVATAR_COUNT} avatars, got ${AVATAR_SOURCES.length}`,
  );
}

export const DEFAULT_AVATAR_INDEX = 1;

export function getUserAvatarSource(avatarIndex?: number | null): ImageSourcePropType {
  if (!avatarIndex || avatarIndex < 1 || avatarIndex > USER_AVATAR_COUNT) {
    return AVATAR_SOURCES[DEFAULT_AVATAR_INDEX - 1]!;
  }

  return AVATAR_SOURCES[avatarIndex - 1] ?? AVATAR_SOURCES[DEFAULT_AVATAR_INDEX - 1]!;
}

export { USER_AVATAR_COUNT };
