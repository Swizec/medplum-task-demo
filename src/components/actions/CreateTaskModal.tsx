import { Box, Button, Modal, Text, Textarea, Title } from '@mantine/core';
import { getReferenceString } from '@medplum/core';
import { Resource } from '@medplum/fhirtypes';
import { ResourceForm, useMedplum } from '@medplum/react';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import React, { FC, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface CreateTaskModalProps {
  readonly opened: boolean;
  readonly onClose: () => void;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const ButWhatifAI: FC<{ setDefaultResource: React.Dispatch<React.SetStateAction<Resource>> }> = ({
  setDefaultResource,
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function doTheThing(): Promise<void> {
    setIsLoading(true);

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
          'What is the intent of this task out of ["unknown", "proposal", "plan", "order", "original-order", "reflex-order", "instance-order", "option"]?',
          'respond in json',
        ].join('\n'),
      },
    ];

    console.log(messages);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages,
      response_format: { type: 'json_object' },
    });
    const response = JSON.parse(completion.choices[0].message.content ?? '{}') as {
      priority: 'Routine' | 'Urgent' | 'ASAP' | 'STAT';
      description: string;
      location: string;
      reason: string;
      intent:
        | 'unknown'
        | 'proposal'
        | 'plan'
        | 'order'
        | 'original-order'
        | 'reflex-order'
        | 'instance-order'
        | 'option';
    };

    console.log({
      resourceType: 'Task',
      status: 'requested',
      description: response.description,
      priority: response.priority.toLowerCase() as 'routine' | 'urgent' | 'asap' | 'stat',
      intent: response.intent,
      authoredOn: new Date().toISOString(),
      //   location: response.location,
    });

    setDefaultResource({
      resourceType: 'Task',
      status: 'requested',
      description: response.description,
      priority: response.priority.toLowerCase() as 'routine' | 'urgent' | 'asap' | 'stat',
      intent: response.intent,
      authoredOn: new Date().toISOString(),
      //   location: response.location,
    });
    setIsLoading(false);
  }

  return (
    <Box p={4}>
      <Title order={4}>But what if AI?</Title>
      <Textarea placeholder="What needs doing?" onChange={(e) => setTaskInput(e.currentTarget.value)}></Textarea>
      <Button onClick={doTheThing} loading={isLoading}>
        Prefill
      </Button>
    </Box>
  );
};

export function CreateTaskModal(props: CreateTaskModalProps): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const location = useLocation();
  const resourceType = location.pathname.split('/')[1];

  // Create a default resource with the correct resourceType
  const [defaultResource, setDefaultResource] = useState({ resourceType } as Resource);

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
      <ButWhatifAI setDefaultResource={setDefaultResource} />
      {defaultResource.status ? (
        <ResourceForm defaultValue={defaultResource} onSubmit={handleSubmit}></ResourceForm>
      ) : (
        'try ai first'
      )}
    </Modal>
  );
}
