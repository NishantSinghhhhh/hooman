import pixeltable as pxt
import datetime

# --- First, let's insert some sample data ---
# Get a handle to the table you created
try:
    image_table = pxt.get_table('demo.images')
    
    # Create a dummy image file for the example if you don't have one
    # NOTE: You must have the 'Pillow' library installed (pip install Pillow)
    from PIL import Image
    dummy_image_path = '/tmp/my_test_image.jpg'
    Image.new('RGB', (60, 30), color = 'red').save(dummy_image_path)
    
    # Insert one row of data (make sure dummy_image_path is a real file)
    print("Inserting a sample row into demo.images...")
    # Using 'update' instead of 'insert' can prevent errors on re-running the script
    image_table.update({
        'user_id': 'user123',
        'image': dummy_image_path,
        'file_path': dummy_image_path,
        'query': 'What objects are in this image?',
        'metadata': {'source': 'upload'},
        'crewai_result': {'objects': ['car', 'tree'], 'confidence': 0.95},
        'tokens_used': 150,
        'context': 'Object detection task',
        'timestamp': datetime.datetime.now()
    }, where=pxt.col.user_id != 'user123') # A condition to avoid duplicate inserts
    print("✅ Sample data inserted/updated.")

except Exception as e:
    print(f"An error occurred: {e}")


print("\nViewing data from the 'demo.images' table:")

image_tbl = pxt.get_table('demo.images')

print(image_tbl.head(10))