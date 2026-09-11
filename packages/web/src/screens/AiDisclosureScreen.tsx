import disclosureMd from "@repo-root/AI-DISCLOSURE.md?raw";
import { Button } from "../components/Button";
import { MarkdownContent } from "../components/MarkdownContent";

type AiDisclosureScreenProps = {
  onBack: () => void;
};

export function AiDisclosureScreen({ onBack }: AiDisclosureScreenProps) {
  return (
    <div className="screen ai-disclosure-screen">
      <div className="ai-disclosure-content">
        <MarkdownContent source={disclosureMd} />
      </div>
      <div className="ai-disclosure-footer">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
