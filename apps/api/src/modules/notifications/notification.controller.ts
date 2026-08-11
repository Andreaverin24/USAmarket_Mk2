import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/request.js';
import { CsrfGuard } from '../../common/csrf.guard.js';
import { SessionGuard } from '../../common/session.guard.js';
import { NotificationService } from './notification.service.js';

@ApiTags('notifications')
@ApiCookieAuth()
@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query('unread') unread?: string) {
    return this.notifications.list(request.auth!.userId, unread === 'true');
  }

  @Patch(':notificationId/read')
  @UseGuards(CsrfGuard)
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
  ) {
    return this.notifications.markRead(request.auth!.userId, notificationId);
  }
}
