const API_KEY = "هنا_المفتاح"; // اعمل حساب في https://serpapi.com
const API_URL = "https://serpapi.com/search";

const serpService = {
  searchRestaurants: async (query) => {
    try {
      const url = `${API_URL}?q=${encodeURIComponent(query + " الشيخ زايد")}&api_key=${API_KEY}&hl=ar&gl=eg`;
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, results: data.organic_results };
    } catch (error) {
      return { success: false };
    }
  }
};

export default serpService;
