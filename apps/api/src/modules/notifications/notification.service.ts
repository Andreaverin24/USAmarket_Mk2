import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service.js';

@Injectable()
export class NotificationService {
  constructor(private readonly db: DatabaseService) {}

  list(userId: string, unreadOnly = false) {
    return this.db.notification.findMany({
      where: {
        recipientUserId: userId,
        channel: 'IN_APP',
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.db.notification.updateMany({
      where: { id: notificationId, recipientUserId: userId, channel: 'IN_APP' },
      data: { status: 'READ', readAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notification not found');
    return this.db.notification.findUniqueOrThrow({ where: { id: notificationId } });
  }
}
