import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { BehaviorBindingPicker } from "./BehaviorBindingPicker";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Behaviors/BehaviorBindingPicker",
  component: BehaviorBindingPicker,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    layers: [
      { name: "Base", id: 0 },
      { id: 1, name: "Num" },
    ],
    onBindingChanged: fn(),
  },
} satisfies Meta<typeof BehaviorBindingPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Example: Story = {
  args: {
    binding: { behaviorId: 0, param1: 0, param2: 0 },
    behaviors: [
      {
        id: 0,
        displayName: "Key Press",
        metadata: [
          {
            param1: [
              { name: "Key", hidUsage: { consumerMax: 0, keyboardMax: 0 } },
            ],
            param2: [],
          },
        ],
      },
    ],
  },
};

// Switching to a behaviour that takes no parameters validates trivially, so it
// exercises the propagate-up path (onBindingChanged) via the behaviour selector.
export const NoParamBehavior: Story = {
  args: {
    binding: { behaviorId: 0, param1: 0, param2: 0 },
    behaviors: [
      {
        id: 0,
        displayName: "Key Press",
        metadata: [
          {
            param1: [
              { name: "Key", hidUsage: { consumerMax: 0, keyboardMax: 0 } },
            ],
            param2: [],
          },
        ],
      },
      {
        id: 1,
        displayName: "Caps Word",
        metadata: [{ param1: [], param2: [] }],
      },
    ],
  },
  // Selecting a no-param behaviour must propagate up via onBindingChanged. This
  // guards the propagate-up effect (the one whose deps were refactored to refs).
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("switch to the no-param behavior", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /Key Press/ }));
      // react-aria renders the listbox in a portal on document.body, so query
      // the option document-wide rather than within the story canvas.
      await userEvent.click(await screen.findByRole("option", { name: "Caps Word" }));
    });

    await step("onBindingChanged fires once with the new behavior", async () => {
      await waitFor(() =>
        expect(args.onBindingChanged).toHaveBeenCalledWith({
          behaviorId: 1,
          param1: 0,
          param2: 0,
        })
      );
      expect(args.onBindingChanged).toHaveBeenCalledTimes(1);
    });
  },
};

export const ModTap: Story = {
  args: {
    binding: { behaviorId: 0, param1: 0, param2: 0 },
    behaviors: [
      {
        id: 0,
        displayName: "Mod-Tap",
        metadata: [
          {
            // param1 = hold (modifier), param2 = tap (key). The slot selector
            // surfaces the tap first.
            param1: [
              { name: "Hold", hidUsage: { consumerMax: 0, keyboardMax: 0 } },
            ],
            param2: [
              { name: "Tap", hidUsage: { consumerMax: 0, keyboardMax: 0 } },
            ],
          },
        ],
      },
    ],
  },
};
