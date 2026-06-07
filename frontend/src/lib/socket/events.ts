export const DOCUMENT_STAGE_UPDATE = 'document:stage_update'
export const DOCUMENT_STATUS_CHANGED = 'document:status_changed'
export const QUEUE_ITEM_ADDED = 'queue:item_added'
export const QUEUE_ITEM_REMOVED = 'queue:item_removed'
export const NOTIFICATION_NEW = 'notification:new'

export function clientChannel(companyId: string): string {
  return `private-client.${companyId}`
}

export function accountantChannel(accountantId: string): string {
  return `private-accountant.${accountantId}`
}

export function adminChannel(): string {
  return 'private-admin.1'
}
