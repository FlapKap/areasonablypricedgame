import argparse
import re
import colorsys
from sklearn.cluster import KMeans
from math import hypot
from collections import defaultdict

def get_color_values(css_file):
    # Use regular expressions to find all color values in the CSS file
    color_pattern = re.compile('#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})')
    with open(css_file, 'r') as f:
        css_contents = f.read()
    colors = re.findall(color_pattern, css_contents)
    rgb_colors = []
    for color in colors:
        if len(color) == 3:
            r, g, b = tuple(int(c*2, 16) for c in color)
        else:
            r, g, b = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
        rgb_colors.append([r, g, b])
    colors = [rgb_to_hex(*rgb) for rgb in rgb_colors]
    return set(colors)

def group_by(seq, key_selector):
    result = defaultdict(list)
    for item in seq:
        key = key_selector(item)
        result[key].append(item)
    return dict(result)


def rgb_to_hex(r, g, b):
    return '{0:02x}{1:02x}{2:02x}'.format(r, g, b)

def kmeans_colors(colors):
    # Convert colors to RGB values
    rgb_colors = []
    for color in colors:
        color = str(color).removeprefix("#")
        r, g, b = tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
        rgb_colors.append([r, g, b])

    # Convert RGB colors to HSL colors and extract brightness
    brightness = [hypot(*rgb) for rgb in rgb_colors]

    # Cluster brightness values into four categories using K-means clustering
    kmeans = KMeans(n_clusters=4, random_state=0).fit([[b] for b in brightness])
    labels = kmeans.predict([[b] for b in brightness])
    
    labelled_colors = zip(labels, rgb_colors)
    color_groups = group_by(labelled_colors, lambda c: c[0])
    
    categories = ['dark', 'semi-dark', 'semi-bright', 'bright']
    
    by_average = [k for k, _ in sorted(color_groups.items(), key=lambda kv: sum([hypot(*c) for _, c in kv[1]]) / len(kv[1]))]
    color_category = {}
    for i, k in enumerate(by_average):
        color_category[categories[i]] = color_groups[k]
    
    category_colors = {}
    for category in categories:
        category_colors[category] = []
    for k, vs in color_category.items():
        for v in vs:
            category_colors[k].append(rgb_to_hex(*v[1]))
    
    return category_colors


def swap_colors(category_colors: dict[str, list]):
    swap = {
        'dark': 'bright', 
        'semi-dark': 'semi-bright', 
        'semi-bright': 'semi-dark', 
        'bright': 'dark'
    }
    swapped_colors = {}
    for category, colors in category_colors.items():
        swapped_colors[swap[category]] = colors
    return swapped_colors

def colors_to_categories(category_colors: dict[str, list]) -> dict[str, str]:
    category_by_color = {}
    for category, colors in category_colors.items():
        for color in colors:
            category_by_color[color.removeprefix("#")] = category
    return category_by_color


def write_css(old_file, new_file, colors, category_by_color: dict[str, str], original_categories: dict[str, list], swapped_color_categories: dict[str, list]):
    css = ""
    with open(old_file, 'r') as f:
        css = f.read()

    for color in colors:
        category = category_by_color[color]
        category_colors = original_categories[category]
        c_index = category_colors.index(color)
        offset = c_index / len(category_colors)
        new_category = swapped_color_categories[category]
        new_color = new_category[int(len(new_category) * offset)]
        css.replace(color, new_color)

    with open(new_file, 'w') as f:
        f.write(css)



def main():
    parser = argparse.ArgumentParser(description='Extract and categorize colors from a CSS file.')
    parser.add_argument('input_file', metavar='input_file', type=str,
                        help='path to the input CSS file')
    parser.add_argument('output_file', metavar='output_file', type=str,
    help='output file name for the swapped colors')
    args = parser.parse_args()

    # Extract colors from CSS file
    colors = get_color_values(args.input_file)

    # Categorize colors using K-means clustering
    category_colors = kmeans_colors(colors)

    # Swap colors based on their brightness category
    swapped_colors = swap_colors(category_colors)

    category_by_color = colors_to_categories(category_colors)

    write_css(args.input_file, args.output_file, colors, category_by_color, category_colors, swapped_colors)


if __name__ == '__main__':
    main()
