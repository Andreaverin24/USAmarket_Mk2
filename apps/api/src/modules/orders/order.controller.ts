import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CsrfGuard } from '../../common/csrf.guard.js';
import type { AuthenticatedRequest } from '../../common/request.js';
import { SessionGuard } from '../../common/session.guard.js';
import {
  cancelOrderSchema,
  createOrderSchema,
  issueInvoiceSchema,
  orderQueueQuerySchema,
  orderVersionSchema,
} from './order.schemas.js';
import { OrderService } from './order.service.js';

@ApiTags('orders')
@Controller()
@UseGuards(SessionGuard)
@ApiCookieAuth()
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post('orders')
  @UseGuards(CsrfGuard)
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = createOrderSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.create(request.auth!.userId, input.data, request.correlationId);
  }

  @Get('me/orders')
  buyerOrders(@Req() request: AuthenticatedRequest) {
    return this.orders.buyerOrders(request.auth!.userId);
  }

  @Get('me/orders/:orderId')
  buyerOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.orders.buyerOrder(request.auth!.userId, orderId);
  }

  @Post('me/orders/:orderId/report-payment')
  @UseGuards(CsrfGuard)
  reportPayment(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = orderVersionSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.reportPayment(
      request.auth!.userId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Post('me/orders/:orderId/cancel')
  @UseGuards(CsrfGuard)
  cancelBuyerOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = cancelOrderSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.cancelByBuyer(
      request.auth!.userId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Get('organizations/:organizationId/orders')
  sellerOrders(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Query() query: unknown,
  ) {
    const input = orderQueueQuerySchema.safeParse(query);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.sellerOrders(request.auth!.userId, organizationId, input.data);
  }

  @Get('organizations/:organizationId/orders/:orderId')
  sellerOrder(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.orders.sellerOrder(request.auth!.userId, organizationId, orderId);
  }

  @Post('organizations/:organizationId/orders/:orderId/invoice')
  @UseGuards(CsrfGuard)
  issueInvoice(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = issueInvoiceSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.issueInvoice(
      request.auth!.userId,
      organizationId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Post('organizations/:organizationId/orders/:orderId/ready')
  @UseGuards(CsrfGuard)
  markReady(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = orderVersionSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.markReady(
      request.auth!.userId,
      organizationId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Post('organizations/:organizationId/orders/:orderId/cancel')
  @UseGuards(CsrfGuard)
  cancelSellerOrder(
    @Req() request: AuthenticatedRequest,
    @Param('organizationId', new ParseUUIDPipe()) organizationId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = cancelOrderSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.cancelBySeller(
      request.auth!.userId,
      organizationId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Get('admin/orders')
  adminOrders(@Req() request: AuthenticatedRequest, @Query() query: unknown) {
    const input = orderQueueQuerySchema.safeParse(query);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.adminOrders(request.auth!.userId, input.data);
  }

  @Get('admin/orders/:orderId')
  adminOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.orders.adminOrder(request.auth!.userId, orderId);
  }

  @Post('admin/orders/:orderId/confirm-payment')
  @UseGuards(CsrfGuard)
  confirmPayment(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = orderVersionSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.confirmPayment(
      request.auth!.userId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Post('admin/orders/:orderId/reject-payment')
  @UseGuards(CsrfGuard)
  rejectPayment(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = orderVersionSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.rejectPayment(
      request.auth!.userId,
      orderId,
      input.data,
      request.correlationId,
    );
  }

  @Post('admin/orders/:orderId/cancel')
  @UseGuards(CsrfGuard)
  cancelAdminOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: unknown,
  ) {
    const input = cancelOrderSchema.safeParse(body);
    if (!input.success) throw new BadRequestException(input.error.flatten());
    return this.orders.cancelByAdmin(
      request.auth!.userId,
      orderId,
      input.data,
      request.correlationId,
    );
  }
}
