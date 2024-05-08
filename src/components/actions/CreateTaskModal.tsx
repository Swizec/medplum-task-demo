import { Box, Button, Modal, Text, Textarea, Title } from '@mantine/core';
import { getReferenceString } from '@medplum/core';
import { Resource } from '@medplum/fhirtypes';
import { ResourceForm, useMedplum } from '@medplum/react';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { FC, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface CreateTaskModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const ButWhatifAI: FC = () => {
  const [taskInput, setTaskInput] = useState('');

  async function doTheThing(): Promise<void> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a medical assistant filling out a task creation form',
      },
      {
        role: 'user',
        content: `Here's a task I need help with:\n${taskInput}`,
      },
      {
        role: 'user',
        content: [
          'What is the priority of this task out of ["Routine", "Urgent", "ASAP", "STAT"]?',
          'Write a description for this task',
          'What is the location for this task?',
          'Why is this task needed?',
          'What is the intent of this task out of ["Unknown", "Proposal", "Plan", "Order", "Original Order", "Reflex Order", "Instance Order", "Option"]?',
          'respond in json',
        ].join('\n'),
      },
    ];

    console.log(messages);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages,
    });

    console.log(completion.choices[0].message.content);
  }

  return (
    <Box p={4}>
      <Title order={4}>But what if AI?</Title>
      <Textarea placeholder="What needs doing?" onChange={(e) => setTaskInput(e.currentTarget.value)}></Textarea>
      <Button onClick={doTheThing}>Prefill</Button>
    </Box>
  );
};

export function CreateTaskModal(props: CreateTaskModalProps): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const location = useLocation();
  const resourceType = location.pathname.split('/')[1];

  // Create a default resource with the correct resourceType
  const defaultResource = { resourceType } as Resource;

  // Function to create the resource and navigate to the resource page when the form is submitted
  const handleSubmit = (newResource: Resource): void => {
    medplum
      .createResource(newResource)
      .then((result) => navigate(`/${getReferenceString(result)}`))
      .catch((error) => console.error(error));
  };

  return (
    <Modal opened={props.opened} onClose={props.onClose}>
      <Text>New {resourceType}</Text>
      <ButWhatifAI />
      <ResourceForm defaultValue={defaultResource} onSubmit={handleSubmit}></ResourceForm>
    </Modal>
  );
}
