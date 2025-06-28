require("dotenv").config({ path: require("path").resolve(__dirname, "./.env") });
const OpenAI = require("openai");

async function testOpenAI() {
  console.log("🚀 Running OpenAI API connection test...");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY is not set in your environment variables.");
    console.log("Please create a `.env` file in the project root and add your key: OPENAI_API_KEY='your_key_here'");
    return;
  }

  console.log("✅ OPENAI_API_KEY found.");
  const openai = new OpenAI();

  try {
    console.log("✨ Calling gpt-4o with a simple test prompt...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Hello, world! If you are receiving this, the API test is successful.",
        },
      ],
      max_tokens: 50,
    });

    console.log("\n🎉 SUCCESS! OpenAI API is working correctly.");
    console.log("-----------------------------------------");
    console.log("Model Response:");
    console.log(completion.choices[0].message.content);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("\n❌ FAILED! An error occurred while contacting the OpenAI API.");
    console.log("-----------------------------------------");
    if (error.response) {
      console.error(`Status Code: ${error.response.status}`);
      console.error("Error Details:", error.response.data.error.message);
      if (error.response.status === 429) {
        console.log("\n💡 HINT: A '429' error usually means you have insufficient quota or need to add a payment method to your OpenAI account for API usage. A regular ChatGPT subscription does not include API credits.");
        console.log("Please check your billing status at: https://platform.openai.com/account/billing/overview");
      } else if (error.response.status === 401) {
        console.log("\n💡 HINT: A '401' error means your API key is invalid or has been revoked. Please verify your key.");
      }
    } else {
      console.error("Error Message:", error.message);
    }
    console.log("-----------------------------------------");
  }
}

testOpenAI();
