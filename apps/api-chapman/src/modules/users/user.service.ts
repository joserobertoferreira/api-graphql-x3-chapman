import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { PrismaService } from '../../prisma/prisma.service';
import { UserFilter } from './dto/filter-user.input';
import { UserConnection } from './entities/user-connection.entity';
import { UserEntity } from './entities/user.entity';
import { buildUserWhereClause } from './helpers/user-where-builder';

type UserResponse = {
  entity: UserEntity;
  raw: Prisma.UserDefaultArgs;
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(user: Prisma.UserGetPayload<Prisma.UserDefaultArgs>): UserEntity {
    return {
      code: user.code,
      name: user.name,
      email: user.email,
    };
  }

  /**
   * Verifica de se o utilizador existe
   * @param code - O código do utilizador a ser verificado.
   * @returns `true` se o utilizador existir, `false` caso contrário.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { code: code },
    });

    return count > 0;
  }

  /**
   * Busca todos os utilizadores ativos e retorna uma lista de entidades UserEntity.
   * @returns Uma lista de UserEntity representando os utilizadores ativos.
   */
  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: 2 }, // Apenas utilizadores ativos
    });
    return users.map(this.mapToEntity.bind(this));
  }

  async findPaginated(args: PaginationArgs, filter?: UserFilter): Promise<UserConnection> {
    const { first, after } = args;

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    const where = buildUserWhereClause(filter);

    const [users, totalCount] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        orderBy: [{ code: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.user.count({ where: where }),
    ]);

    const hasNextPage = users.length > first;
    const nodes = hasNextPage ? users.slice(0, -1) : users;

    const edges = nodes.map((customer) => ({
      cursor: Buffer.from(customer.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(customer as any),
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
        hasNextPage,
        hasPreviousPage: after ? true : false,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  async findOne(code: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { code: code },
    });

    if (!user) {
      throw new NotFoundException(`User with code "${code}" not found.`);
    }

    return { entity: this.mapToEntity(user as any), raw: user as any };
  }

  /**
   * Busca um utilizador pelo seu código e retorna apenas os campos especificados.
   * @param code - O código do utilizador a ser buscado.
   * @param select - Um objeto Prisma.UserSelect para definir os campos de retorno.
   * @returns Um objeto parcial do utilizador contendo apenas os campos selecionados.
   * @throws NotFoundException se o utilizador não for encontrado.
   */
  async findByCode<T extends Prisma.UserSelect>(
    code: string,
    select: T,
  ): Promise<Prisma.UserGetPayload<{ select: T }>> {
    const user = await this.prisma.user.findUnique({
      where: { code: code },
      select: select,
    });

    if (!user) {
      throw new NotFoundException(`User with code "${code}" not found.`);
    }

    return user as Prisma.UserGetPayload<{ select: T }>;
  }
}
