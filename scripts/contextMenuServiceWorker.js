// Function to get + decode API key
const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['openai-key'], (result) => {
      if (result['openai-key']) {
        // console.log(result['openai-key']); somehow this is doing nothing...
        const decodedKey = atob(result['openai-key']);
        // console.log(decodedKey);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: 'inject', content },
      (response) => {
        if (response.status === 'failed') {
          console.log('injection failed.');
        }
      }
    );
  });
};

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = 'https://api.openai.com/v1/completions';
	
  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.7,
    }),
  });
	
  // Select the top choice and send back -> What is "top choice"?
  const completion = await completionResponse.json();
  return completion.choices.pop();
}

const generateCompletionAction = async (info) => {
  try {
    sendMessage('generating...');
    console.log("Did you enter your API key in the extension?");

    const { selectionText } = info;
    const basePromptPrefix = `
    Write me some ad copy for a Google Text Ad for the following product.
    
    Product: 
    `;
    const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);
    console.log("First output: " + baseCompletion.text)

    sendMessage(baseCompletion.text);

    const secondPrompt = `
    Take the product description and old ad copy of the product below and generate new ad copy. Make it compelling so that when someone reads the ad copy they really wants to buy the product. Sell the product to the reader.
    
    Product description: ${selectionText}
    
    Old ad copy: ${baseCompletion.text}
    
    New ad copy:
    `;

    const secondPromptCompletion = await generate(secondPrompt);
    console.log("Second output: " + secondPromptCompletion.text)

    sendMessage(secondPromptCompletion.text);
  } catch (error) {
    console.log(error);

    sendMessage(error.toString());
  }
};

chrome.contextMenus.create({
  id: 'context-run',
  title: 'Generate ad copy',
  contexts: ['selection'],
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);