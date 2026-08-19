import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'maycloud-siteweb-back',
      timestamp: new Date().toISOString(),
    };
  }
}
