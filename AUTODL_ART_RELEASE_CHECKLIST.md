# AutoDL Art Release Checklist

This checklist is for publishing `AIToolkit-LoRAContinuedTraining` to AutoDL Art so other users can run it from the app market.

## 1. Code And Feature Validation

- Confirm the app starts successfully from the Docker image.
- Confirm the AI Toolkit UI opens correctly.
- Confirm `New Training Job -> Target -> Base LoRAs` is visible.
- Confirm `Select` in `Base LoRAs` can browse existing `.safetensors` files.
- Confirm `Blend` slider updates the `Strength` field in the `0.0 - 1.0` range.
- Confirm direct numeric `Strength` input still accepts advanced values such as `1.2` or `-0.3`.
- Confirm at least one training job runs successfully with:
  - no `base_loras`
  - one `base_lora`
  - multiple `base_loras`
- Confirm training logs print:
  - loaded base LoRA count
  - module count
  - unmatched key count

## 2. Runtime Validation

- Confirm the UI service is reachable on port `8675`.
- Confirm first launch can finish model download without startup errors.
- Confirm output checkpoints are written under the training output folder.
- Confirm the app still works when `AI_TOOLKIT_AUTH` is enabled.

## 3. Docker/Image Preparation

- Build from the repository Docker setup:
  - `docker/Dockerfile`
  - `docker/start.sh`
- Confirm the container starts the production UI with:
  - `cd /app/ai-toolkit/ui && npm run start`
- Confirm GPU is available inside the container.
- Confirm required volumes/paths are writable:
  - dataset folder
  - output folder
  - config folder
  - Hugging Face cache

## 4. AutoDL / AutoDL Art Publishing Flow

- Launch a test instance on AutoDL with the final image.
- Verify the app in a real AutoDL runtime.
- Save the validated instance as an image.
- Publish the image from the AutoDL Art web UI.
- Create or update the app entry based on that image.
- Fill in:
  - app name
  - short description
  - long description
  - recommended GPU
  - startup notes
  - authentication notes
  - example workflow
- Submit for review.

## 5. Suggested Market Metadata

- App name:
  - `AI Toolkit UI - LoRA Continued Training`
- Category:
  - AI Training / Image Model Fine-Tuning
- Core selling points:
  - Continue training on top of one existing LoRA
  - Continue training on top of multiple LoRAs with blend weights
  - Visual configuration in AI Toolkit UI
  - Base LoRA selector for existing `.safetensors`
- Recommended GPU guidance:
  - SDXL / similar: `16 GB+`
  - Flux / Flex / larger transformer models: `24 GB+`

## 6. User-Facing Notes To Include

- The final trained LoRA is saved as a new LoRA delta.
- To reproduce the same look used during training, users may need to load:
  - the original `base_loras`
  - the new trained LoRA
- `Strength` is typically used in the `0.0 - 1.0` range.
- Values above `1.0` or below `0.0` are advanced options.

## 7. Final Publish Gate

- Repository pushed and tagged
- Docker image verified
- AutoDL test completed
- Market description prepared
- Cover image/screenshots prepared
- Review submission completed
