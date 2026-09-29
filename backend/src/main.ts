import * as dns from 'dns';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Render (and Docker's default bridge network) doesn't provide outbound
// IPv6 routing, but Node 18+'s default 'verbatim' DNS ordering can still
// try a host's AAAA record first — smtp.gmail.com publishes one, so SMTP
// connections fail with ENETUNREACH unless IPv4 is preferred explicitly.
dns.setDefaultResultOrder('ipv4first');

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? value : asNumber;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());

  // Behind nginx/ALB every request arrives from a proxy address, so without
  // this the throttler keys all users off ONE IP (shared /auth 10/min bucket).
  // TRUST_PROXY: number of hops (e.g. "1"), or "true"/preset — see .env.example.
  const trustProxy = process.env.TRUST_PROXY;
  app.set('trust proxy', trustProxy ? parseTrustProxy(trustProxy) : 'loopback');

  // origin: true reflects any requesting origin (wildcard "*" is invalid with
  // credentials: true). Every web/Expo-web client is allowed.
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Gobadi API')
    .setDescription(
      [
        'API documentation for the Gobadi backend.',
        '',
        '### WebSocket (Socket.IO) events',
        '',
        'OpenAPI has no concept of WebSocket events, so the `ChatGateway` real-time',
        'contract is documented here instead of as REST paths below.',
        '',
        'Connect to the default Socket.IO namespace (`/socket.io`) at this same host,',
        '',
        'authenticating with `{ auth: { token: <accessToken> } }` on the handshake',
        '(same JWT access token used for `Authorization: Bearer` on REST calls).',
        '',
        'An invalid/expired token disconnects the client immediately.',
        '',
        '### Client → server',
        '',
        '- `joinConversation` `{ conversationId: number }` — join a conversation room; no-op if not a participant.',
        '',
        '- `sendMessage` `{ conversationId: number, text: string }` — persists and broadcasts a text message; returns the saved message.',
        '',
        '- `typing` `{ conversationId: number, isTyping: boolean }` — broadcasts a typing indicator to the room.',
        '',
        '- `markRead` `{ messageId: number }` — marks a message read and broadcasts the status update.',
        '',
        '### Server → client',
        '',
        '- `messageReceived` — a `ChatMessageClientView` (see `POST /chat/message` response schema), sent to the conversation room.',
        '',
        '- `typingIndicator` `{ userId: number, isTyping: boolean }` — sent to the conversation room.',
        '',
        '- `messageStatusUpdate` `{ id: number, status: "SENT" | "DELIVERED" | "READ" }` — sent to the conversation room.',
        '',
        "- `conversationUpdated` — a `ChatMessageClientView`, sent to each participant's personal `user:{id}` room (for conversation-list screens that have not joined the specific conversation room).",
        '',
        '',
        'Media attachments are REST-only (`POST /chat/message/attachment`) — there is no socket event for sending attachments.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
