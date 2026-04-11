# OpenRouter Calculator

This project is deployed at [https://openroutercalculator.ivoras.net/](https://openroutercalculator.ivoras.net/).

A web-based tool to estimate the cost of using various AI models via [OpenRouter](https://openrouter.ai/). It uses periodic snapshots of OpenRouter's pricing to provide accurate estimates based on your specific token usage and request patterns.

## Features

- **Real-time Cost Estimation**: Calculate costs for input tokens, output tokens, and per-request fees.
- **Model Comparison**: View a list of available models with their respective pricing (prompt, completion, image, and request).
- **Dynamic Filtering**: Quickly find specific models by name or ID.
- **Interactive UI**: Sort models by calculated cost and adjust parameters on the fly.
- **Shareable URL state**: Filter, token counts, per-request mode, and sort settings are reflected in the page URL (`window.location.hash`) so you can bookmark or share a link that restores the same view.
- **Snapshot-based Pricing**: Uses actual pricing data fetched from OpenRouter to ensure accuracy.

## Tech Stack

- **Backend**: [Django](https://www.djangoproject.com/) (Python)
- **Frontend**: HTML5, CSS3 (Bootstrap 5), Vanilla JavaScript
- **Database**: Django ORM (supports various SQL databases)

## Getting Started

### Prerequisites

- Python 3.10+
- `pip` (Python package installer)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd openroutercalculator
   ```

2. **Install dependencies**
   (Note: Ensure you have installed all required packages from `requirements.txt` if available)
   ```bash
   pip install -r requirements.txt
   ```

3. **Database Migrations**
   ```bash
   cd webapp
   python manage.py migrate
   ```

4. **Fetch Latest Pricing Data**
   Before running the server, you need to fetch the latest model pricing snapshots from OpenRouter:
   ```bash
   python manage.py fetch
   ```

5. **Run the Development Server**
   ```bash
   python manage.py runserver
   ```

6. **Access the Application**
   Open your browser and navigate to `http://127.0.0.1:8000/`

## Usage

- **Input Tokens**: Enter the number of tokens you expect in your prompt.
- **Output Tokens**: Enter the number of tokens you expect in the model's response.
- **Per-request Pricing**: Enable this toggle if the models you are using charge a fixed fee per request.
- **Filter**: Type in the filter box to narrow down the list of models.
- **Sort**: Click on the "Calculated" header to sort models by their estimated cost.

### URL fragment (shareable state)

The calculator updates the URL hash as you change inputs. The fragment uses short query-style keys (like `#f=gpt&i=1000`). Values that match the defaults are omitted to keep links short.

| Key | Meaning | Default (omitted from URL) |
|-----|---------|----------------------------|
| `f` | Filter (name or model id substring) | empty |
| `i` | Input tokens | `0` |
| `o` | Output tokens | `0` |
| `r` | Request count (when per-request pricing applies) | `1` |
| `t` | Per-request pricing enabled | off (`1` when on) |
| `s` | Sort by calculated cost | off (`1` when on) |
| `d` | Sort direction when sorted: `a` = ascending | descending (key omitted) |

When you open or reload a page with a hash, the UI and table (filter, calculated prices, and sort order) are applied from those parameters.

## License

[Specify License, e.g., MIT]
