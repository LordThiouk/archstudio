import { SERVICES, type ServiceRole } from '../templates/services';

/** Client bricks deliberately live outside the hyperscaler service table. */
export type BrickId = ServiceRole | 'webApp' | 'mobileApp';

export const BRICK_IDS: readonly BrickId[] = ['webApp', 'mobileApp', ...(Object.keys(SERVICES) as ServiceRole[])];

export function isBrickId(value: string): value is BrickId {
  return value === 'webApp' || value === 'mobileApp' || Object.hasOwn(SERVICES, value);
}
