import zen2han from "./zen2han";

const table2json = (table: Array<Array<string>>) => {
  const header = table[0]
  const records = table.slice(1)

  return records.map((record: Array<string>) => {

    const properties = header.reduce((prev: any, column: any) => {
      let value = record[header.indexOf(column)] || '';
      value = zen2han(value).trim().replace(/^['"`]+|['"`]+$/g, "");
      prev[column] = value;
      return prev;
    }, {});
    return properties;
  });

}

export default table2json;
