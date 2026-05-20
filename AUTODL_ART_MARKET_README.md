# AI Toolkit UI - LoRA Continued Training

This build extends AI Toolkit UI with continued LoRA training workflows for users who want to train a new LoRA on top of one or more existing LoRAs.

## What This App Adds

- Train a new LoRA using one existing LoRA as the base.
- Train a new LoRA using multiple existing LoRAs as the base.
- Assign a different blend weight to each base LoRA.
- Configure the workflow directly in the AI Toolkit UI instead of editing YAML by hand.
- Select existing `.safetensors` files from the UI when building the base LoRA stack.

## Typical Workflow

1. Open `New Training Job`.
2. Go to `Target`.
3. Add one or more entries in `Base LoRAs`.
4. Use `Select` to choose an existing LoRA checkpoint.
5. Adjust the blend value for each base LoRA.
6. Start training the new LoRA.

During training, the effective model is:

`base model + base_loras + trainable_lora`

## Blend / Strength Guidance

- `1.0` = full strength
- `0.5` = half strength
- `0.2` = light influence
- `0.0` = no effect

The recommended range is `0.0 - 1.0`.

Advanced users can still enter values above `1.0` or below `0.0` for stronger or inverted influence.

## Important Behavior

- The newly trained LoRA is saved as a new LoRA delta.
- The original base LoRAs are not merged into the saved output automatically.
- To reproduce the same style used during training, you may need to load:
  - the same base LoRAs
  - the newly trained LoRA

## UI Improvements In This Build

- Base LoRA list in the training form
- File selector for `.safetensors`
- Blend slider for quick `0-1` weight control
- Training log feedback for base LoRA loading and unmatched keys

## Recommended Hardware

- SDXL and similar models: `16 GB+ VRAM`
- Flux / Flex / larger transformer-based models: `24 GB+ VRAM`

## Port And Access

- Default app port: `8675`
- Optional auth can be enabled with `AI_TOOLKIT_AUTH`

## Best For

- Character consistency refinement
- Style continuation
- Incremental LoRA development
- Combining multiple style or concept LoRAs before continuing training
