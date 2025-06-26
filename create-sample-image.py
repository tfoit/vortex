#!/usr/bin/env python3
"""
Simple script to create a handwritten-style image from text
This simulates what a handwritten advisory minutes document might look like
"""

from PIL import Image, ImageDraw, ImageFont
import textwrap
import os

def create_handwritten_style_image():
    # Read the sample document
    try:
        with open('sample-advisory-minutes.txt', 'r') as f:
            text = f.read()
    except FileNotFoundError:
        print("Error: sample-advisory-minutes.txt not found")
        return
    
    # Image settings
    width, height = 800, 1200
    background_color = (255, 255, 255)  # White
    text_color = (0, 0, 139)  # Dark blue (simulating pen)
    
    # Create image
    img = Image.new('RGB', (width, height), background_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a handwriting-like font, fallback to default
    try:
        # You can download a handwriting font and put it in the same directory
        font = ImageFont.truetype("Arial.ttf", 14)
    except:
        font = ImageFont.load_default()
    
    # Wrap text and draw
    lines = text.split('\n')
    y_position = 30
    line_height = 20
    
    for line in lines:
        if line.strip():
            # Wrap long lines
            wrapped_lines = textwrap.wrap(line, width=70)
            for wrapped_line in wrapped_lines:
                if y_position < height - 30:
                    # Add slight randomness to simulate handwriting
                    x_offset = 30 + (hash(wrapped_line) % 5)
                    draw.text((x_offset, y_position), wrapped_line, fill=text_color, font=font)
                    y_position += line_height
        else:
            y_position += line_height // 2
    
    # Save the image
    output_path = 'sample-handwritten-advisory-minutes.png'
    img.save(output_path)
    print(f"✅ Sample handwritten-style image created: {output_path}")
    print(f"📁 You can now upload this image to test the OCR and AI analysis")
    
    return output_path

if __name__ == "__main__":
    create_handwritten_style_image() 