import logging
import httpx
from google import genai
from google.genai import types
from app.database import settings

logger = logging.getLogger(__name__)

class GoogleAIService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI client initialized successfully with API key.")
            except Exception as e:
                logger.error(f"Failed to initialize Google GenAI client: {e}")
        else:
            logger.warning("GEMINI_API_KEY is not configured in environment settings.")

    def generate_text(self, prompt: str, system_instruction: str = None) -> str:
        """
        Generates text using Gemini 2.5 Flash.
        """
        if not self.client:
            raise ValueError("Google GenAI client is not initialized. Check your GEMINI_API_KEY.")
        
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
        )
        try:
            response = self.client.models.generate_content(
                model='gemini-3.5-flash',
                contents=prompt,
                config=config
            )
            return response.text
        except Exception as e:
            logger.error(f"Error in generate_text: {e}")
            raise e

    def analyze_image(self, prompt: str, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        """
        Sends image bytes and a text prompt to Gemini 2.5 Flash for multimodal analysis.
        """
        if not self.client:
            raise ValueError("Google GenAI client is not initialized. Check your GEMINI_API_KEY.")

        try:
            response = self.client.models.generate_content(
                model='gemini-3.5-flash',
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ]
            )
            return response.text
        except Exception as e:
            logger.error(f"Error in analyze_image: {e}")
            raise e

    async def analyze_image_url(self, prompt: str, image_url: str) -> str:
        """
        Downloads an image from a URL and sends it with a prompt to Gemini 2.5 Flash.
        """
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(image_url)
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch image from URL: {image_url} (Status: {response.status_code})")
            
            # Determine content type
            content_type = response.headers.get("content-type", "image/jpeg")
            return self.analyze_image(prompt, response.content, content_type)

    def generate_image_metadata(self, image_url: str) -> dict:
        """
        Downloads image from URL and uses Gemini to generate a description and tags.
        """
        if not self.client:
            logger.warning("Google GenAI client not initialized, skipping metadata generation.")
            return {"description": "", "tags": ""}
        
        try:
            import requests
            import json
            response = requests.get(image_url, timeout=15)
            if response.status_code != 200:
                logger.error(f"Failed to fetch image for metadata generation: {image_url}")
                return {"description": "", "tags": ""}
            
            mime_type = response.headers.get("content-type", "image/jpeg")
            prompt = """
            Analyze this photo. Return a JSON object with exactly two fields:
            1. "description": A natural description of what is in the photo (setting, people, emotions, colors).
            2. "tags": A string containing 5 to 10 comma-separated keywords representing the photo.
            
            Strictly return JSON only. Example format:
            {
              "description": "A family of three smiling together on a green grass field during a sunny afternoon.",
              "tags": "family, grass, sunny, smile, group, outdoor, happy"
            }
            """
            
            res = self.client.models.generate_content(
                model='gemini-3.5-flash',
                contents=[
                    types.Part.from_bytes(data=response.content, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            data = json.loads(res.text)
            return {
                "description": data.get("description", ""),
                "tags": data.get("tags", "")
            }
        except Exception as e:
            logger.error(f"Error generating image metadata with Gemini: {e}")
            return {"description": "", "tags": ""}


    def generate_image(self, prompt: str, aspect_ratio: str = "1:1") -> bytes:
        """
        Generates an image using Imagen 3 and returns the raw image bytes (JPEG).
        """
        if not self.client:
            raise ValueError("Google GenAI client is not initialized. Check your GEMINI_API_KEY.")

        try:
            result = self.client.models.generate_images(
                model='imagen-4.0-generate-001',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    output_mime_type="image/jpeg",
                    aspect_ratio=aspect_ratio,
                    person_generation="ALLOW_ADULT"
                )
            )
            return result.generated_images[0].image.image_bytes
        except Exception as e:
            logger.error(f"Error in generate_image (Imagen): {e}")
            raise e

# Instantiate the service singleton
google_ai = GoogleAIService()
