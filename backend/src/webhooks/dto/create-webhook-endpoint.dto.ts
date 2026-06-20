import { IsString, IsUrl, IsArray, MinLength } from 'class-validator';

export class CreateWebhookEndpointDto {
  @IsUrl()
  url: string;

  @IsArray()
  @IsString({ each: true })
  event_types: string[];
}
