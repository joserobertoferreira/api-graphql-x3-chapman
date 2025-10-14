import { Prisma } from '@prisma/client';

export namespace SiteTypes {
  export type WithInclude<I extends Prisma.SiteInclude> = Prisma.SiteGetPayload<{ include: I }>;

  export type Payload<I extends Prisma.SiteInclude> = WithInclude<I> | null;

  export type WithCompany = WithInclude<{ company: true }>;
}
