import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const makeHost = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
};

describe('HttpExceptionFilter', () => {
  it('preserves developer-defined payload fields (block-times 409 conflicts)', () => {
    const { host, json, status } = makeHost();
    const payload = {
      statusCode: 409,
      message: 'Blocking this time will cancel existing appointments.',
      conflicts: [{ id: 12, price: 500 }],
      estimatedWalletDeduction: 550,
      billing: { totalFee: 550, status: 'Pending' },
    };

    new HttpExceptionFilter().catch(
      new HttpException(payload, HttpStatus.CONFLICT),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 409,
      message: 'Blocking this time will cancel existing appointments.',
      conflicts: [{ id: 12, price: 500 }],
      estimatedWalletDeduction: 550,
      billing: { totalFee: 550, status: 'Pending' },
    });
  });

  it('maps class-validator message arrays to errorSources', () => {
    const { host, json, status } = makeHost();

    new HttpExceptionFilter().catch(
      new HttpException(
        {
          statusCode: 400,
          message: ['startDate must be a string'],
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        errorSources: [{ path: 'body', message: 'startDate must be a string' }],
      }),
    );
  });

  it('does not let payload fields override the envelope', () => {
    const { host, json } = makeHost();

    new HttpExceptionFilter().catch(
      new HttpException(
        { statusCode: 409, message: 'conflict', success: true, extra: 1 },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 409, extra: 1 }),
    );
  });

  it('falls back to a 500 for non-HTTP exceptions', () => {
    const { host, json, status } = makeHost();

    new HttpExceptionFilter().catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'boom',
      }),
    );
  });
});
