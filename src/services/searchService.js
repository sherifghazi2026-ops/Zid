const API_KEY = "tvly-هنا_تحط_المفتاح"; // اعمل حساب في https://tavily.com
const API_URL = "https://api.tavily.com/search";

const searchService = {
  searchRestaurants: async (query) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: API_KEY,
          query: `مطاعم في الشيخ زايد ${query}`,
          search_depth: "basic",
          max_results: 5
        })
      });

      const data = await response.json();
      return { success: true, results: data.results };
    } catch (error) {
      return { success: false };
    }
  }
};

export default searchService;
