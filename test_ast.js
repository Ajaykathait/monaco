
const { getReadOnlyRanges } = require('./lib/ast');

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

console.log('YAML Ranges:', getReadOnlyRanges(yamlSample, 'yaml'));
console.log('XML Ranges:', getReadOnlyRanges(xmlSample, 'xml'));
