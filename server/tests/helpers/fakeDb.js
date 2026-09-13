function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeHexId(n) {
  return n.toString(16).padStart(24, '0').slice(-24);
}

function normalizeValue(v) {
  if (v && typeof v === 'object' && typeof v.toString === 'function') return v.toString();
  return v;
}

function matchField(rowValue, condition) {
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    if (condition.$regex != null) {
      const flags = condition.$options || '';
      const regex = new RegExp(condition.$regex, flags);
      return regex.test(String(rowValue || ''));
    }
    if (condition.$gte != null || condition.$lte != null) {
      const value = String(rowValue || '');
      if (condition.$gte != null && value < String(condition.$gte)) return false;
      if (condition.$lte != null && value > String(condition.$lte)) return false;
      return true;
    }
  }
  return String(normalizeValue(rowValue)) === String(normalizeValue(condition));
}

function matches(row, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      const ok = Array.isArray(value) && value.some(part => matches(row, part));
      if (!ok) return false;
      continue;
    }

    if (!matchField(row[key], value)) return false;
  }

  return true;
}

function sortRows(rows, sortSpec = {}) {
  const entries = Object.entries(sortSpec);
  if (!entries.length) return rows;
  const [field, direction] = entries[0];
  const dir = direction >= 0 ? 1 : -1;

  return rows.sort((a, b) => {
    const av = normalizeValue(a[field]);
    const bv = normalizeValue(b[field]);
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
}

export class FakeCollection {
  constructor(initialRows = []) {
    this.rows = initialRows.map(r => ({ ...r }));
    this.seq = initialRows.length + 1;
  }

  async createIndex() {}

  async insertOne(doc) {
    const insertedId = makeHexId(this.seq++);
    this.rows.push({ ...doc, _id: insertedId });
    return { insertedId };
  }

  async findOne(filter, options = {}) {
    const row = this.rows.find(r => matches(r, filter)) || null;
    if (!row) return null;

    const out = { ...row };
    if (options.projection && options.projection.password_hash === 0) delete out.password_hash;
    return out;
  }

  async countDocuments(filter = {}) {
    return this.rows.filter(r => matches(r, filter)).length;
  }

  find(filter = {}) {
    let data = this.rows.filter(r => matches(r, filter)).map(r => ({ ...r }));

    const chain = {
      sort(spec = {}) {
        data = sortRows(data, spec);
        return chain;
      },
      skip(n = 0) {
        data = data.slice(n);
        return chain;
      },
      limit(n = data.length) {
        data = data.slice(0, n);
        return chain;
      },
      async toArray() {
        return clone(data);
      },
    };

    return chain;
  }

  async updateOne(filter, update) {
    const index = this.rows.findIndex(r => matches(r, filter));
    if (index < 0) return { matchedCount: 0, modifiedCount: 0 };

    if (update && update.$set) {
      this.rows[index] = { ...this.rows[index], ...update.$set };
    }

    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(filter) {
    const index = this.rows.findIndex(r => matches(r, filter));
    if (index < 0) return { deletedCount: 0 };
    this.rows.splice(index, 1);
    return { deletedCount: 1 };
  }

  aggregate(pipeline = []) {
    let data = this.rows.map(r => ({ ...r }));

    for (const stage of pipeline) {
      if (stage.$match) {
        data = data.filter(r => matches(r, stage.$match));
      } else if (stage.$group) {
        const total = {
          total_minutes: 0,
          overtime_weekend_minutes: 0,
          overtime_holiday_minutes: 0,
        };

        for (const row of data) {
          total.total_minutes += Number(row.duration_minutes || 0);
          total.overtime_weekend_minutes += Number(row.overtime_weekend_minutes || 0);
          total.overtime_holiday_minutes += Number(row.overtime_holiday_minutes || 0);
        }

        data = [{ _id: null, ...total }];
      }
    }

    return {
      async toArray() {
        return clone(data);
      },
    };
  }
}
