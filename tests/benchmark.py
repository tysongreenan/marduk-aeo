import asyncio
import aiohttp
import time
import uuid
import statistics
from datetime import datetime
import json
import sys
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TimeElapsedColumn
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
import traceback

console = Console()

# Test configuration
NUM_REQUESTS = 100
CONCURRENT_REQUESTS = 10
API_URL = "http://localhost:8000"
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Use a real brand ID from the database
BRAND_ID = "a7e8aeb4-5927-4d30-a74a-1eacc52c3b6f"

class BenchmarkError(Exception):
    """Custom error class for benchmark-specific errors"""
    pass

async def check_server_health():
    """Check if the FastAPI server is running and healthy"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/docs") as response:
                if response.status != 200:
                    raise BenchmarkError(f"Server health check failed with status {response.status}")
                return True
    except aiohttp.ClientError as e:
        raise BenchmarkError(f"Server is not running or not accessible: {str(e)}")

async def make_request(session, brand_id: str, request_id: int):
    """Make a single request to create a monitoring task"""
    start_time = time.time()
    error_context = {}
    
    for retry in range(MAX_RETRIES):
        try:
            async with session.post(
                f"{API_URL}/tasks/",
                json={
                    "brand_id": brand_id,
                    "query_text": f"Test query {uuid.uuid4()}",
                    "frequency_minutes": 60,
                    "llm_type": "openai",
                    "llm_version": "gpt-4",
                    "active": True
                }
            ) as response:
                response_time = time.time() - start_time
                
                if response.status >= 400:
                    error_text = await response.text()
                    error_context = {
                        "status_code": response.status,
                        "response_body": error_text,
                        "headers": dict(response.headers),
                        "request_id": request_id
                    }
                    if retry < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_DELAY * (2 ** retry))  # Exponential backoff
                        continue
                    return response_time, {
                        "type": "HTTP_ERROR",
                        "error": f"HTTP {response.status}",
                        "context": error_context
                    }
                
                return response_time, response.status
                
        except aiohttp.ClientError as e:
            error_context = {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
                "request_id": request_id
            }
            if retry < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (2 ** retry))
                continue
            return time.time() - start_time, {
                "type": "CONNECTION_ERROR",
                "error": str(e),
                "context": error_context
            }
        except Exception as e:
            error_context = {
                "error_type": type(e).__name__,
                "error_details": str(e),
                "traceback": traceback.format_exc(),
                "request_id": request_id
            }
            return time.time() - start_time, {
                "type": "UNEXPECTED_ERROR",
                "error": str(e),
                "context": error_context
            }
    
    return time.time() - start_time, {
        "type": "MAX_RETRIES_EXCEEDED",
        "error": "Maximum retries exceeded",
        "context": error_context
    }

async def run_benchmark(brand_id: str):
    """Run the benchmark with multiple concurrent requests"""
    # Check server health first
    try:
        await check_server_health()
    except BenchmarkError as e:
        console.print(Panel(
            f"[red]Server Health Check Failed[/red]\n\n{str(e)}\n\nPlease make sure the FastAPI server is running with:\n[green]uvicorn monitoring.main:app --reload[/green]",
            title="Error",
            border_style="red"
        ))
        sys.exit(1)
    
    async with aiohttp.ClientSession() as session:
        with Progress(
            SpinnerColumn(),
            *Progress.get_default_columns(),
            TimeElapsedColumn(),
            console=console
        ) as progress:
            task = progress.add_task("[cyan]Running benchmark...", total=NUM_REQUESTS)
            
            results = []
            error_counts = {"CONNECTION_ERROR": 0, "HTTP_ERROR": 0, "UNEXPECTED_ERROR": 0}
            
            for i in range(0, NUM_REQUESTS, CONCURRENT_REQUESTS):
                batch = min(CONCURRENT_REQUESTS, NUM_REQUESTS - i)
                batch_tasks = [make_request(session, brand_id, i + j) for j in range(batch)]
                batch_results = await asyncio.gather(*batch_tasks)
                
                # Track error types
                for _, status in batch_results:
                    if isinstance(status, dict):
                        error_counts[status["type"]] = error_counts.get(status["type"], 0) + 1
                
                results.extend(batch_results)
                progress.update(task, advance=batch)
    
    return results, error_counts

def analyze_results(results, error_counts):
    """Analyze benchmark results with detailed error analysis"""
    successful = [(time, status) for time, status in results if isinstance(status, int)]
    failed = [(time, status) for time, status in results if isinstance(status, dict)]
    
    if successful:
        times = [t for t, _ in successful]
        stats = {
            "Total Requests": len(results),
            "Successful Requests": len(successful),
            "Failed Requests": len(failed),
            "Success Rate": f"{(len(successful)/len(results))*100:.1f}%",
            "Average Response Time": f"{statistics.mean(times):.3f}s",
            "Median Response Time": f"{statistics.median(times):.3f}s",
            "Min Response Time": f"{min(times):.3f}s",
            "Max Response Time": f"{max(times):.3f}s",
            "Standard Deviation": f"{statistics.stdev(times):.3f}s" if len(times) > 1 else "N/A"
        }
        
        percentiles = {
            "90th Percentile": f"{statistics.quantiles(times, n=10)[-1]:.3f}s",
            "95th Percentile": f"{statistics.quantiles(times, n=20)[-1]:.3f}s",
            "99th Percentile": f"{statistics.quantiles(times, n=100)[-1]:.3f}s"
        }
    else:
        stats = {
            "Total Requests": len(results),
            "Successful Requests": 0,
            "Failed Requests": len(failed),
            "Success Rate": "0%"
        }
        percentiles = {}
    
    return stats, percentiles, failed, error_counts

def print_results(stats, percentiles, failed, error_counts):
    """Print benchmark results with enhanced error reporting"""
    console.print("\n[bold green]Benchmark Results:[/bold green]")
    
    # Print main statistics
    stats_table = Table(show_header=True, header_style="bold magenta")
    stats_table.add_column("Metric", style="cyan")
    stats_table.add_column("Value", style="green")
    
    for metric, value in stats.items():
        stats_table.add_row(metric, str(value))
    
    console.print(stats_table)
    
    # Print error summary
    if error_counts:
        console.print("\n[bold yellow]Error Summary:[/bold yellow]")
        error_table = Table(show_header=True, header_style="bold magenta")
        error_table.add_column("Error Type", style="yellow")
        error_table.add_column("Count", style="red")
        error_table.add_column("Percentage", style="red")
        
        total_errors = sum(error_counts.values())
        for error_type, count in error_counts.items():
            percentage = (count / total_errors) * 100 if total_errors > 0 else 0
            error_table.add_row(
                error_type,
                str(count),
                f"{percentage:.1f}%"
            )
        
        console.print(error_table)
    
    # Print percentiles
    if percentiles:
        console.print("\n[bold green]Response Time Percentiles:[/bold green]")
        percentile_table = Table(show_header=True, header_style="bold magenta")
        percentile_table.add_column("Percentile", style="cyan")
        percentile_table.add_column("Time", style="green")
        
        for percentile, value in percentiles.items():
            percentile_table.add_row(percentile, str(value))
        
        console.print(percentile_table)
    
    # Print detailed error information
    if failed:
        console.print("\n[bold red]Detailed Error Report:[/bold red]")
        for time, error in failed:
            if isinstance(error, dict):
                panel = Panel(
                    f"[bold red]Error Type:[/bold red] {error['type']}\n"
                    f"[bold red]Error Message:[/bold red] {error['error']}\n"
                    f"[bold red]Response Time:[/bold red] {time:.3f}s\n\n"
                    f"[bold yellow]Context:[/bold yellow]\n"
                    f"{json.dumps(error['context'], indent=2)}",
                    title=f"Request Error Details",
                    border_style="red"
                )
                console.print(panel)
                console.print("")

async def main():
    """Main benchmark function"""
    console.print(Panel(
        f"[bold]FastAPI Endpoint Benchmark[/bold]\n\n"
        f"Endpoint: [cyan]{API_URL}[/cyan]\n"
        f"Requests: [cyan]{NUM_REQUESTS}[/cyan]\n"
        f"Concurrent Requests: [cyan]{CONCURRENT_REQUESTS}[/cyan]\n"
        f"Max Retries: [cyan]{MAX_RETRIES}[/cyan]",
        title="Configuration",
        border_style="blue"
    ))
    
    start_time = time.time()
    results, error_counts = await run_benchmark(BRAND_ID)
    total_time = time.time() - start_time
    
    stats, percentiles, failed, error_counts = analyze_results(results, error_counts)
    print_results(stats, percentiles, failed, error_counts)
    
    console.print(Panel(
        f"Total Time: [bold green]{total_time:.2f}s[/bold green]\n"
        f"Requests/Second: [bold green]{NUM_REQUESTS/total_time:.2f}[/bold green]",
        title="Performance Summary",
        border_style="green"
    ))

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print(Panel(
            "[bold red]Benchmark interrupted by user[/bold red]",
            title="Interrupted",
            border_style="red"
        ))
        sys.exit(1)
    except Exception as e:
        console.print(Panel(
            f"[bold red]Error running benchmark:[/bold red]\n\n{traceback.format_exc()}",
            title="Error",
            border_style="red"
        ))
        sys.exit(1) 