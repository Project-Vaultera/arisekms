import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  BaseApiErrorResponse,
  BaseApiResponse,
  SwaggerBaseApiResponse,
} from '../../shared/dtos/base-api-response.dto';
import { PaginationParamsDto } from '../../shared/dtos/pagination-params.dto';
import { AppLogger } from '../../shared/logger/logger.service';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { CreateTicketInput, UpdateTicketInput } from '../dtos/ticket-input.dto';
import { TicketOutput } from '../dtos/ticket-output.dto';
import { TicketService } from '../services/ticket.service';

@ApiTags('support-tickets')
@Controller('support-tickets')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(TicketController.name);
  }

  @Post()
  @ApiOperation({ summary: 'Open support ticket API' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SwaggerBaseApiResponse(TicketOutput) })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async createTicket(
    @ReqContext() ctx: RequestContext,
    @Body() input: CreateTicketInput,
  ): Promise<BaseApiResponse<TicketOutput>> {
    this.logger.log(ctx, `${this.createTicket.name} was called`);

    const ticket = await this.ticketService.createTicket(ctx, input);
    return { data: ticket, meta: {} };
  }

  @Get()
  @ApiOperation({ summary: 'Get support tickets as a list API (own rows, all for admins)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse([TicketOutput]) })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getTickets(
    @ReqContext() ctx: RequestContext,
    @Query() query: PaginationParamsDto,
  ): Promise<BaseApiResponse<TicketOutput[]>> {
    this.logger.log(ctx, `${this.getTickets.name} was called`);

    const { tickets, count } = await this.ticketService.getTickets(ctx, query.limit, query.offset);
    return { data: tickets, meta: { count } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket by id API' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(TicketOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async getTicket(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<BaseApiResponse<TicketOutput>> {
    this.logger.log(ctx, `${this.getTicket.name} was called`);

    const ticket = await this.ticketService.getTicketById(ctx, id);
    return { data: ticket, meta: {} };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update support ticket API (status: admin-only, except authors closing/reopening own)' })
  @ApiResponse({ status: HttpStatus.OK, type: SwaggerBaseApiResponse(TicketOutput) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor)
  async updateTicket(
    @ReqContext() ctx: RequestContext,
    @Param('id') ticketId: number,
    @Body() input: UpdateTicketInput,
  ): Promise<BaseApiResponse<TicketOutput>> {
    this.logger.log(ctx, `${this.updateTicket.name} was called`);

    const ticket = await this.ticketService.updateTicket(ctx, ticketId, input);
    return { data: ticket, meta: {} };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete support ticket API' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: BaseApiErrorResponse })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async deleteTicket(
    @ReqContext() ctx: RequestContext,
    @Param('id') id: number,
  ): Promise<void> {
    this.logger.log(ctx, `${this.deleteTicket.name} was called`);

    await this.ticketService.deleteTicket(ctx, id);
  }
}
