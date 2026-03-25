import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Market } from './entities/market.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Market])],
    exports: [TypeOrmModule],
})
export class MarketsModule { }
