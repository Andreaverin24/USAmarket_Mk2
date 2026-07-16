import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database.service.js';

export interface SearchProvider {
  productIds(query: string): Promise<string[]>;
}

@Injectable()
export class PostgresSearchProvider implements SearchProvider {
  constructor(private readonly db: DatabaseService) {}

  async productIds(query: string) {
    const rows = await this.db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM products
      WHERE status = 'PUBLISHED'::"ProductStatus"
        AND (
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(maker, ''))
            @@ websearch_to_tsquery('english', ${query})
          OR title % ${query}
        )
      ORDER BY
        ts_rank(
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(maker, '')),
          websearch_to_tsquery('english', ${query})
        ) DESC,
        similarity(title, ${query}) DESC
      LIMIT 500
    `;
    return rows.map((row) => row.id);
  }
}
