"""Download SD 1.5 base model for local LoRA testing."""

import argparse
import os

DEFAULT_REPO = "runwayml/stable-diffusion-v1-5"
DEFAULT_CACHE = r"D:\huggingface_cache"
HF_MIRROR_ENDPOINT = "https://hf-mirror.com"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download SD 1.5 for AI Toolkit LoRA testing",
        epilog=(
            "国内慢时请用: python scripts/download_sd15.py --mirror\n"
            "中断后重新运行同一命令会自动续传。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--repo",
        default=DEFAULT_REPO,
        help=f"Hugging Face repo id (default: {DEFAULT_REPO})",
    )
    parser.add_argument(
        "--cache-dir",
        default=None,
        help=f"HF hub cache directory (default: HUGGINGFACE_HUB_CACHE, HF_HOME, or {DEFAULT_CACHE})",
    )
    parser.add_argument(
        "--mirror",
        action="store_true",
        help=f"Use HF mirror (sets HF_ENDPOINT={HF_MIRROR_ENDPOINT})",
    )
    parser.add_argument(
        "--endpoint",
        default=None,
        help="Custom Hugging Face endpoint URL (overrides --mirror if set)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Parallel download workers (default: 4)",
    )
    args = parser.parse_args()

    if args.endpoint:
        os.environ["HF_ENDPOINT"] = args.endpoint.rstrip("/")
    elif args.mirror:
        os.environ["HF_ENDPOINT"] = HF_MIRROR_ENDPOINT

    cache_dir = (
        args.cache_dir
        or os.environ.get("HUGGINGFACE_HUB_CACHE")
        or os.environ.get("HF_HOME")
        or DEFAULT_CACHE
    )
    os.makedirs(cache_dir, exist_ok=True)
    os.environ.setdefault("HF_HOME", cache_dir)
    os.environ.setdefault("HUGGINGFACE_HUB_CACHE", os.path.join(cache_dir, "hub"))

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("Missing huggingface_hub. Install: pip install huggingface_hub")
        return 1

    endpoint = os.environ.get("HF_ENDPOINT", "https://huggingface.co (official)")
    print(f"Repo: {args.repo}")
    print(f"Cache: {os.environ['HUGGINGFACE_HUB_CACHE']}")
    print(f"Endpoint: {endpoint}")
    print(f"Workers: {args.workers}")
    print("Downloading (login if needed: huggingface-cli login)...")

    local_path = snapshot_download(
        repo_id=args.repo,
        cache_dir=os.environ["HUGGINGFACE_HUB_CACHE"],
        max_workers=max(1, args.workers),
    )

    print()
    print("Done.")
    print(f"Snapshot: {local_path}")
    print()
    print("AI Toolkit model.name_or_path:")
    print(f'  name_or_path: "{args.repo}"')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
