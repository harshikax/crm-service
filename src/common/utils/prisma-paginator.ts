import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { SortOrder } from '../enums/crm.enum';

interface PrismaModelDelegate<T> {
  findMany: (args: any) => Promise<T[]>;
  count: (args: any) => Promise<number>;
}

export async function paginate<T>(
  model: PrismaModelDelegate<T>,
  pagination: PaginationQueryDto,
  args: {
    where?: any;
    include?: any;
    select?: any;
    orderBy?: any;
  } = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 10));
  const skip = (page - 1) * limit;

  let orderBy = args.orderBy;
  if (pagination.sortBy) {
    orderBy = {
      [pagination.sortBy]: pagination.sortOrder || SortOrder.DESC,
    };
  }

  const [data, total] = await Promise.all([
    model.findMany({
      ...args,
      skip,
      take: limit,
      orderBy: orderBy ?? { created_at: SortOrder.DESC },
    }),
    model.count({
      where: args.where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
