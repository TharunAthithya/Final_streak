import { PrismaService } from './prisma/prisma.service';
export declare class AppController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): Promise<{
        status: string;
        database: string;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        database: string;
        error: any;
        timestamp: string;
    }>;
}
