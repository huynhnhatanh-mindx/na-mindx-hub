const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, '../backend/src/index.ts');
let content = fs.readFileSync(backendPath, 'utf8');

const buildPaginatedResponseCode = `
// Helper function to build paginated responses
async function buildPaginatedResponse(model: any, query: any, page: number, limit: number, sort: any = { _id: -1 }) {
  const skip = (page - 1) * limit;
  const data = await model.find(query).sort(sort).skip(skip).limit(limit);
  const totalItems = await model.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data,
    currentPage: page,
    totalPages,
    totalItems
  };
}
`;

if (!content.includes('async function buildPaginatedResponse')) {
  content = content.replace(
    "// --- MIDDLEWARE ---",
    buildPaginatedResponseCode + "\\n// --- MIDDLEWARE ---"
  );
  fs.writeFileSync(backendPath, content, 'utf8');
  console.log('buildPaginatedResponse added successfully');
} else {
  console.log('buildPaginatedResponse already exists');
}
