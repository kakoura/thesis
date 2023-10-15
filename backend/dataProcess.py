import asyncio
import asyncpg
import base64
import torch
import cv2
import numpy as np
from PIL import Image
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from transformers import BlipProcessor, BlipForConditionalGeneration
import websockets
import json
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
print("Models loaded")

clients=set()

async def connect_pg():
  
  
    # Connect to the PostgreSQL database
    connection = await asyncpg.connect(
        user='postgres',
        password='evaggelatos1',
        host='localhost',
        port='5432',
        database='PaintingsCoinsDB'
    )

    async def websocket_server(websocket,path):
        clients.add(websocket)
        async for message in websocket:
            pass
        clients.remove(websocket)
        print("WebSocket client connected:", websocket.remote_address)
    
    start_server=websockets.serve(websocket_server,"localhost",5002)
    
    
    # Wait for notifications from PostgreSQL
    try:
        await connection.add_listener('new_entry', process_notification)
        asyncio.ensure_future(start_server)
        while True:
            await asyncio.sleep(5)
    finally:
        await connection.close()
    
    





async def process_notification(connection, pid, channel, payload):
    print('New entry notification received:', payload)
    await fetch_and_process_last_entry(connection)
    for client in clients:
        try:
            await client.send(json.dumps({"type": "newCoins"}))
            print("WebSocket message sent to the client.")
        except Exception as e:
            print("Error sending WebSocket message:", e)
    # async with websockets.connect("ws://localhost:5002") as websocket:
    #     await websocket.send(json.dumps({"type":"newCoins"}))
    #     print("WebSocket message sent to the client.")


async def fetch_and_process_last_entry(connection):
    global model,processor
    try:
        # Fetch the last inserted row from the database
        query = 'SELECT * FROM paintings ORDER BY id DESC LIMIT 1;'
        result = await connection.fetchrow(query)
        print('New entry received:')
        print('Id =', result[0])
        print('Name =', result[1])
        

        # Process the image data
        image_decoded = base64.b64decode(result['file'])
        nparr = np.frombuffer(image_decoded, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        pil_image = Image.fromarray(image)
        raw_image = pil_image.convert('RGB')
        
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        

    # Move the model to the appropriate device
        model = model.to(device)

    # Move the inputs to the appropriate device
        inputs = processor(raw_image, return_tensors="pt").to(device)

    # Generate captions with GPU acceleration
        with torch.no_grad():
          out = model.generate(**inputs)

    # Decode the generated captions
        caption = processor.decode(out[0], skip_special_tokens=True)
    
        print(caption)

    # Read descriptions and jpg file names from the text file
        with open('simple_captions.txt', 'r',encoding="utf8") as file:
            lines = file.readlines()

        descriptions = []
        jpg_files = []

        for line in lines:
            parts = line.strip().split(',')
            jpg_files.append(parts[0])
            descriptions.append(parts[1])
            
            
        # Process the input sentence
        input_sentence = caption

        # Calculate the cosine similarity scores
        vectorizer = TfidfVectorizer()
        description_vectors = vectorizer.fit_transform(descriptions)
        input_vector = vectorizer.transform([input_sentence])
        similarity_scores = cosine_similarity(input_vector, description_vectors)


        # Get the indices of the top 5 similarity scores
        top_indices = similarity_scores.argsort()[0][-50:][::-1]

        # Get the corresponding jpg file names and descriptions
        top_jpg_files = [jpg_files[i] for i in top_indices]
        top_descriptions = [descriptions[i] for i in top_indices]
        top_score=[similarity_scores[0][i] for i in top_indices]


        # Check for duplicate descriptions and update the output accordingly
        output = []
        processed_descriptions = set()

        for jpg_file, description, score in zip(top_jpg_files, top_descriptions, top_score):
            if len(output) == 5:
                break
            if description not in processed_descriptions:
                output.append((description, jpg_file, score))
                processed_descriptions.add(description)
        

        # Print the output with non-duplicate descriptions
        for idx, (description, jpg_file, score) in enumerate(output, start=1):
            img_path='All_coin_images/'+str(jpg_file)+'.jpg'
            jpg_file=jpg_file.split('.')
            name=jpg_file[0]+'.'+jpg_file[1]+'.'+jpg_file[2]
            fin = open(img_path,"rb")
            img=fin.read()
            # img_file = psycopg2.Binary(img)
            await connection.execute('Insert INTO "coins" (coin_file,description,sim_score,name) VALUES ($1,$2,$3,$4)', img,description,score,name)
            
        print("Coins inserted into database")
            
            
            
            
            
            
            
            

    except asyncpg.exceptions.PostgresError as e:
        print('Error occurred while fetching the last entry:', e)



if __name__ == '__main__':
    asyncio.run(connect_pg())