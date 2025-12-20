/**
 * Artillery processor for generating test data
 */

module.exports = {
  generateRandomEmail,
  generateRandomJobData,
};

function generateRandomEmail() {
  const random = Math.random().toString(36).substring(7);
  return `test-${random}@example.com`;
}

function generateRandomJobData() {
  const categories = ['plumbing', 'electrical', 'painting', 'carpentry', 'cleaning'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return {
    title: `Test Job ${Math.random().toString(36).substring(7)}`,
    description: 'Test job description for load testing',
    category: randomCategory,
    location: 'London, UK',
    budget: Math.floor(Math.random() * 5000) + 100,
  };
}

