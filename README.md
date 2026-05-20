# AI Toolkit (LoRA Continued Training Extension)

This repository is an extension built on top of [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit).

- Original project: [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit)
- License: [MIT](./LICENSE)
- Copyright: Ostris, LLC

For the full installation guide, model support list, and original toolkit documentation, please refer to the upstream project.

## What This Extension Adds

- `network.base_loras`
  - Train a new LoRA on top of one or more existing base LoRAs
- AI Toolkit UI support
  - Configure `Base LoRAs` in the UI
  - Set per-LoRA strength
  - Select `.safetensors` files from the UI
  - Scan either the default training directory or a custom directory
  - View base LoRA loading feedback in logs
- Two save modes
  - Save only the newly trained LoRA delta
  - Optionally also export a merged LoRA file

## Example

```yaml
network:
  type: lora
  linear: 32
  linear_alpha: 32
  base_loras:
    - path: "output/lora1/lora1.safetensors"
      strength: 1.0
    - path: "output/style1/style1.safetensors"
      strength: 0.35
```

## How It Works

During training, the effective model is:

`base model + base_loras + trainable_lora`

That means:

- `base_loras` act as a fixed starting point
- the new LoRA learns extra content on top of that starting point
- the new LoRA is learning an additional delta, not replacing the base LoRAs

## The Two Output Types

This extension supports two different output ideas. The difference is simple:

### 1. New LoRA Only

This is the default output.

What it means:

- Only the newly trained LoRA is saved
- The base LoRAs are **not** merged into the output file

When to use it:

- You want to keep the workflow flexible
- You want to continue stacking LoRAs later
- You are okay loading:
  - the original `base_loras`
  - plus the new trained LoRA

Think of it like this:

- Base LoRAs = the fixed foundation
- New LoRA = the new changes you trained

### 2. Merged LoRA Output

This is an optional extra output in the UI.

What it means:

- The system still saves the normal new LoRA
- It can also export an additional merged file
- That merged file contains:
  - `base_loras + new_lora`

When to use it:

- You want a more convenient single LoRA file
- You want something closer to the exact combined effect used during training

Think of it like this:

- New LoRA only = “just save my new changes”
- Merged output = “also give me one combined file”

## Simple Rule Of Thumb

If you want maximum flexibility:

- use **New LoRA Only**

If you want convenience and a single combined output:

- also enable **Save Merged LoRA Output**

## Important Note

The default saved LoRA does **not** automatically contain the full base LoRA stack.

So if you want to reproduce the same effect used during training, you will usually need:

- the same `base_loras`
- the new trained LoRA

unless you use the extra merged output file.

## UI Location

In the AI Toolkit UI:

- `New Training Job -> Target -> Base LoRAs`
- `New Training Job -> Save -> Save Merged LoRA Output`
