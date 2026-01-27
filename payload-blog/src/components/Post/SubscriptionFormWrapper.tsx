"use client";

import dynamic from "next/dynamic";

const SubscriptionForm = dynamic<SubscriptionFormProps>(
  // @ts-expect-error
  () => import("custom-form-client/src/forms/SubscriptionForm"),
  { ssr: false },
);

interface SubscriptionFormStyles {
  SubscriptionForm?: string;
  Title?: string;
  Subtitle?: string;
  Email?: string;
  SubscribeButton?: string;
  RecaptchaNotice?: string;
}

interface SubscriptionFormProps {
  id?: string;
  action: string;
  styles?: SubscriptionFormStyles;
  responseMessage?: string;
  captchaType?: string;
  captchaSiteKey?: string;
  captchaOptions?: Record<string, unknown>;
  afterSubmitCallback?: (() => void) | undefined;
}

export default SubscriptionForm;
