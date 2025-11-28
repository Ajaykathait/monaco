import { getReadOnlyRanges, getIdLineRanges } from './lib/ast';

const jsonSample = `
{
    "id": 1,
    "name": "Item 1"
}
`;

const yamlSample = `
- id: 1
  name: Item 1
- id: 2
  name: Item 2
`;

const xmlSample = `
<root>
  <item>
    <id>1</id>
    <name>Item 1</name>
  </item>
  <item>
    <id>2</id>
    <name>Item 2</name>
  </item>
</root>
`;

console.log('JSON Line Ranges:', getIdLineRanges(jsonSample, 'json'));
console.log('YAML Line Ranges:', getIdLineRanges(yamlSample, 'yaml'));
console.log('XML Line Ranges:', getIdLineRanges(xmlSample, 'xml'));
