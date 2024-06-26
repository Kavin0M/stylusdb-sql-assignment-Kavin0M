function parseSelectQuery(query) {
  try {
    query = query.trim();

    let selectPart, fromPart;

    let isDistinct = false;
    if (query.toUpperCase().includes("SELECT DISTINCT")) {
      isDistinct = true;
      query = query.replace("SELECT DISTINCT", "SELECT");
    }

    const limitRegex = /(.+)\sLIMIT\s(\d+)/i;
    const limitMatch = query.match(limitRegex);
    query = limitMatch?.length > 1 ? limitMatch[1].trim() : query;

    let limit = null;
    if (limitMatch) {
      limit = parseInt(limitMatch[2]);
    }

    const orderByRegex = /(.+)\sORDER BY\s(.+)/i;
    const orderByMatch = query.match(orderByRegex);
    query = orderByMatch?.length > 1 ? orderByMatch[1].trim() : query;

    let orderByFields = null;
    if (orderByMatch) {
      orderByFields = orderByMatch[2].split(",").map((field) => {
        const [fieldName, order] = field.trim().split(/\s+/);
        return { fieldName, order: order ? order.toUpperCase() : "ASC" };
      });
    }

    const groupByRegex = /(.+)\sGROUP BY\s(.+)/i;
    const groupByMatch = query.match(groupByRegex);
    query = groupByMatch?.length > 1 ? groupByMatch[1].trim() : query;

    let groupByFields = null;
    if (groupByMatch) {
      groupByFields = groupByMatch[2].split(",").map((field) => field.trim());
    }

    const aggregateRegex =
      /(\bCOUNT\b|\bAVG\b|\bSUM\b|\bMIN\b|\bMAX\b)\s*\(\s*(\*|\w+)\s*\)/i;
    hasAggregate = aggregateRegex.test(query);

    const whereSplit = query.split(/\sWHERE\s/i);
    query = whereSplit[0];

    const whereClause = whereSplit.length > 1 ? whereSplit[1].trim() : null;

    const joinSplit = query.split(/\s(INNER|LEFT|RIGHT) JOIN\s/i);
    selectPart = joinSplit[0].trim();

    const selectRegex = /^SELECT\s(.+?)\sFROM\s(.+)/i;
    const selectMatch = selectPart.match(selectRegex);
    if (!selectMatch) {
      throw new Error("Invalid SELECT format");
    }

    const [, fields, table] = selectMatch;

    const { joinType, joinCondition, joinTable } = parseJoinClause(query);

    let whereClauses = [];
    if (whereClause) {
      whereClauses = parseWhereClause(whereClause);
    }

    return {
      fields: fields.split(",").map((field) => field.trim()),
      table: table.trim(),
      whereClauses,
      joinType,
      joinTable,
      joinCondition,
      groupByFields,
      hasAggregateWithoutGroupBy: hasAggregate && !groupByFields,
      orderByFields,
      limit,
      isDistinct,
    };
  } catch (error) {
    throw new Error(`Query parsing error: ${error.message}`);
  }
}

function parseWhereClause(whereString) {
  const conditionRegex = /(.*?)(=|!=|>|<|>=|<=)(.*)/;

  return whereString.split(/ AND | OR /i).map((conditionString) => {
    if (conditionString.includes(" LIKE ")) {
      const [field, pattern] = conditionString.split(/\sLIKE\s/i);
      console.log(field, pattern);
      return {
        field: field.trim(),
        operator: "LIKE",
        value: pattern.trim().replace(/['"]/g, ""),
      };
    } else {
      const match = conditionString.match(conditionRegex);
      if (match) {
        const [, field, operator, value] = match;
        return { field: field.trim(), operator, value: value.trim() };
      }
    }
    throw new Error("Invalid WHERE clause format");
  });
}

function parseJoinClause(query) {
  const joinRegex =
    /\s(INNER|LEFT|RIGHT) JOIN\s(.+?)\sON\s([\w.]+)\s*=\s*([\w.]+)/i;
  const joinMatch = query.match(joinRegex);

  if (joinMatch) {
    return {
      joinType: joinMatch[1].trim(),
      joinTable: joinMatch[2].trim(),
      joinCondition: {
        left: joinMatch[3].trim(),
        right: joinMatch[4].trim(),
      },
    };
  }

  return {
    joinType: null,
    joinTable: null,
    joinCondition: null,
  };
}

function parseInsertQuery(query) {
  const insertRegex = /INSERT INTO (\w+)\s\((.+)\)\sVALUES\s\((.+)\)/i;
  const match = query.match(insertRegex);

  if (!match) {
    throw new Error("Invalid INSERT INTO syntax.");
  }

  const [, table, columns, values] = match;
  return {
    type: "INSERT",
    table: table.trim(),
    columns: columns.split(",").map((column) => column.trim()),
    values: values.split(",").map((value) => value.trim()),
  };
}

function parseDeleteQuery(query) {
  const deleteRegex = /DELETE FROM (.+) WHERE (.+)/i;
  const match = query.match(deleteRegex);

  if (!match) {
    throw new Error("Invalid DELETE syntax");
  }

  const [, table, whereClause] = match;

  let whereClauses = [];
  if (whereClause) {
    whereClauses = parseWhereClause(whereClause);
  }

  return {
    type: "DELETE",
    table,
    whereClauses,
  };
}

function test() {
  console.log(parseDeleteQuery("DELETE FROM courses WHERE course_id = '2'"));
}
// test();

module.exports = {
  parseSelectQuery,
  parseJoinClause,
  parseInsertQuery,
  parseDeleteQuery,
};
