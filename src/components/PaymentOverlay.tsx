import { X, CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import logger from "@/lib/logger";

const log = logger.child("Payment");

interface PaymentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentOverlay = ({ isOpen, onClose }: PaymentOverlayProps) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: "$9.99",
      period: "/month",
      features: [
        "100 AI conversations per month",
        "Basic model access",
        "Email support",
        "Standard response time",
      ],
    },
    {
      id: "premium",
      name: "Premium Plan",
      price: "$19.99",
      period: "/month",
      popular: true,
      features: [
        "Unlimited AI conversations",
        "Access to all models",
        "Priority support",
        "Faster response times",
        "Advanced features",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      price: "$49.99",
      period: "/month",
      features: [
        "Everything in Premium",
        "Custom model training",
        "API access",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  ];

  const handleSelectPlan = (planId: string) => {
    log.info(`Selected plan: ${planId}`);
    // TODO: Integrate with Stripe payment system
    alert(`Payment integration for ${planId} plan will be implemented here`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto border">
        {/* Header */}
        <div className="border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Choose Your Plan</h2>
            <p className="text-muted-foreground mt-1">
              Select the plan that best fits your needs
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-lg border p-6 ${
                  plan.popular
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5 mr-3" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                  variant={plan.popular ? "default" : "secondary"}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Select {plan.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>All plans include a 14-day free trial. Cancel anytime.</p>
            <p className="mt-1">Secure payment processing powered by Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
