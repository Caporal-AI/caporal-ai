import styled from '@emotion/styled';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { AgentMessage, AgentMode, AgentTraceStep } from '../../../types';
import { SectionCard } from '../../../components/atoms/SectionCard';

export interface AssistantModeOption {
  value: AgentMode;
  label: string;
  helper: string;
}

interface AssistantPanelViewProps {
  title: string;
  subtitle: string;
  linkedRunLabel: string;
  hasLinkedRun: boolean;
  mode: AgentMode;
  modeOptions: AssistantModeOption[];
  question: string;
  questionLabel: string;
  questionPlaceholder: string;
  actionLabel: string;
  actionDisabled: boolean;
  isLoading: boolean;
  modeHelper: string;
  suggestions: string[];
  errors: string[];
  whatIfWarning: string | null;
  emptyConversationLabel: string;
  conversationTitle: string;
  messages: AgentMessage[];
  latestMessage: AgentMessage | null;
  toolCalls: AgentTraceStep[];
  onModeChange: (mode: AgentMode) => void;
  onQuestionChange: (value: string) => void;
  onSuggestionClick: (value: string) => void;
  onSubmit: () => void;
}

const Root = styled(Box)`
  display: grid;
  gap: 0.9rem;
`;

const HeaderTitle = styled(Typography)`
  font-weight: 800;
`;

const HeaderSubtitle = styled(Typography)`
  margin-top: 0.45rem;
`;

const LinkedRun = styled(Box)`
  margin-top: 0.75rem;
`;

const ModeGrid = styled(ToggleButtonGroup)`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;

  .MuiToggleButtonGroup-grouped {
    border-radius: 999px !important;
    border: 1px solid rgba(108, 82, 57, 0.3) !important;
    text-transform: none;
    font-weight: 700;
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const BodyStack = styled(Stack)`
  margin-top: 0.8rem;
`;

const ControlsRow = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
`;

const SuggestionsWrap = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ScrollMessages = styled(Box)`
  display: grid;
  gap: 0.6rem;
  max-height: 24rem;
  overflow-y: auto;
  padding-right: 0.25rem;
`;

const MessageCard = styled(SectionCard)`
  padding: 0.8rem;
`;

const ToolTraceCard = styled(SectionCard)`
  padding: 0.75rem;
`;

const MessageText = styled(Typography)`
  margin-top: 0.5rem;
`;

const Row = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
`;

export function AssistantPanelView({
  title,
  subtitle,
  linkedRunLabel,
  hasLinkedRun,
  mode,
  modeOptions,
  question,
  questionLabel,
  questionPlaceholder,
  actionLabel,
  actionDisabled,
  isLoading,
  modeHelper,
  suggestions,
  errors,
  whatIfWarning,
  emptyConversationLabel,
  conversationTitle,
  messages,
  latestMessage,
  toolCalls,
  onModeChange,
  onQuestionChange,
  onSuggestionClick,
  onSubmit,
}: AssistantPanelViewProps): JSX.Element {
  return (
    <Root>
      <SectionCard>
        <HeaderTitle variant="h6">{title}</HeaderTitle>
        <HeaderSubtitle variant="body2" color="text.secondary">
          {subtitle}
        </HeaderSubtitle>
        <LinkedRun>
          <Chip size="small" color={hasLinkedRun ? 'success' : 'default'} label={linkedRunLabel} />
        </LinkedRun>
      </SectionCard>

      {errors.map((error) => (
        <Alert key={error} severity="error">
          {error}
        </Alert>
      ))}

      <SectionCard>
        <BodyStack spacing={1}>
          <ModeGrid
            value={mode}
            exclusive
            onChange={(_, value: AgentMode | null) => {
              if (value) {
                onModeChange(value);
              }
            }}
            size="small"
          >
            {modeOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ModeGrid>

          <TextField
            fullWidth
            multiline
            minRows={4}
            label={questionLabel}
            placeholder={questionPlaceholder}
            value={question}
            onChange={(event) => {
              onQuestionChange(event.target.value);
            }}
          />

          <ControlsRow>
            <Button
              variant="contained"
              disabled={actionDisabled}
              onClick={onSubmit}
            >
              {actionLabel}
            </Button>
            {isLoading ? <CircularProgress size={20} /> : null}
          </ControlsRow>

          <Typography variant="body2" color="text.secondary">
            {modeHelper}
          </Typography>

          <SuggestionsWrap>
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outlined"
                size="small"
                onClick={() => {
                  onSuggestionClick(suggestion);
                }}
              >
                {suggestion}
              </Button>
            ))}
          </SuggestionsWrap>

          {whatIfWarning ? <Alert severity="warning">{whatIfWarning}</Alert> : null}
        </BodyStack>
      </SectionCard>

      {latestMessage ? (
        <SectionCard>
          <Typography variant="subtitle1" fontWeight={700}>
            Resumen
          </Typography>
          <MessageText>{latestMessage.content}</MessageText>
        </SectionCard>
      ) : null}

      <SectionCard>
        <Typography variant="h6" fontWeight={800}>
          {conversationTitle}
        </Typography>
        {messages.length > 0 ? (
          <ScrollMessages>
            {messages.map((message) => (
              <MessageCard key={message.id}>
                <Row>
                  <Chip
                    size="small"
                    label={message.role === 'ASSISTANT' ? 'Caporal' : 'Usuario'}
                    color={message.role === 'ASSISTANT' ? 'primary' : 'default'}
                  />
                  {message.mode ? <Chip size="small" variant="outlined" label={message.mode} /> : null}
                </Row>
                <MessageText>{message.content}</MessageText>
              </MessageCard>
            ))}
          </ScrollMessages>
        ) : (
          <Typography color="text.secondary">{emptyConversationLabel}</Typography>
        )}
      </SectionCard>

      <SectionCard>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography fontWeight={700}>Detalle tecnico</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {toolCalls.length > 0 ? (
              <Stack spacing={1}>
                {toolCalls.map((tool) => (
                  <ToolTraceCard key={tool.id}>
                    <Row>
                      <Chip
                        size="small"
                        color={tool.status === 'SUCCESS' ? 'success' : tool.status === 'ERROR' ? 'error' : 'default'}
                        label={tool.status}
                      />
                      <Typography fontWeight={700}>{tool.toolName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tool.latencyMs} ms
                      </Typography>
                    </Row>
                    <Divider />
                    <Typography variant="body2" color="text.secondary">
                      Entrada: {JSON.stringify(tool.inputJson).slice(0, 140)}
                    </Typography>
                  </ToolTraceCard>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Aun no hay herramientas ejecutadas.</Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </SectionCard>
    </Root>
  );
}
