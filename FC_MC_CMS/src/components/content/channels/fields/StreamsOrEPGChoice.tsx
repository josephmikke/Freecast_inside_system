import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { makeEmptyStream, StreamPayload } from '@entities/content/stream';
import { repairIngestionEpg, triggerIngestionEpg, validateIngestionEpg } from '@/api/epg';
import DoubleChoiceField from '@components/commons/forms/DoubleChoiceField';
import CustomLoader from '@components/commons/CustomLoader';
import { EPGResult } from '@entities/content/epg';
import EPGValidationModal from './EPGValidationModal';
import ConfirmDeleteEPGModal from './ConfirmDeleteEPGModal';

interface EPGValidationResult {
  epgId: string
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalPrograms: number;
  sortedPrograms: any[];
  timeGaps: any[];
  timeOverlaps: any[];
}

interface StreamsOrEPGChoiceProps {
  streamOrEpg: 'streams' | 'EPG';
  setStreamOrEpg: (value: 'streams' | 'EPG') => void;
  appendStream: (stream: StreamPayload) => void;
  epg: EPGResult | undefined;
  streamCount: number;
  onTriggered?: ()=> void;
}

export default function StreamsOrEPGChoice({
  streamOrEpg,
  setStreamOrEpg,
  appendStream,
  epg,
  streamCount,
  onTriggered,
}: StreamsOrEPGChoiceProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationModalOpen, setValidationModalOpen] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<EPGValidationResult | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  const onClickValidate = async () => {
    if (epg && epg.id) {
      try {
        setValidating(true);
        const response = await validateIngestionEpg(epg.id);
        setValidationResult({ epgId: epg.id, ...response.data });
        setValidationModalOpen(true);
      } catch (error) {
        toast.error('Error while validating EPG');
      } finally {
        setValidating(false);
      }
    } else {
      toast.error('The EPG must be saved before triggering the validation.');
    }
  };

  const onClickTrigger = () => {
    if (epg && epg.id) {
      setConfirmModalOpen(true);
    } else {
      toast.error('The EPG must be saved before triggering the ingestion.');
    }
  };

  const onKeepConfirm = async () => {
    if (epg && epg.id) {
      try {
        setLoading(true);
        setConfirmModalOpen(false);
        await triggerIngestionEpg(epg.id);
        toast.success('Ingestion triggered');
        onTriggered?.();
      } catch (error) {
        toast.error('Error while triggering ingestion');
      } finally {
        setLoading(false);
      }
    }
  };

  const onRemoveConfirm = async () => {
    if (epg && epg.id) {
      try {
        setLoading(true);
        setConfirmModalOpen(false);
        await repairIngestionEpg(epg.id);
        toast.success('Ingestion triggered');
        onTriggered?.();
      } catch (error) {
        toast.error('Error while triggering ingestion');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div className="flex flex-row justify-between items-center w-full">
        <DoubleChoiceField
          first={{ label: `Streams: ${streamCount}`, value: 'streams' }}
          second={{ label: 'EPG', value: 'EPG' }}
          onSelect={(value: string) => setStreamOrEpg(value as 'streams' | 'EPG')}
          selected={streamOrEpg}
          bgColor="bg-green"
        />
        {streamOrEpg === 'streams' && (
          <button onClick={() => appendStream(makeEmptyStream())} type="button">
            <FontAwesomeIcon icon={faCirclePlus} size="2x" />
          </button>
        )}
        {streamOrEpg === 'EPG' && (
        <div className="flex flex-row justify-end items-center w-full">
          <button disabled={validating} onClick={onClickValidate} className="bg-blue w-48 h-12 p-3 rounded-xl mr-2" type="button">
            {validating ? (
              <CustomLoader size={20} contained={false} />
            ) : (
              <p>Validate EPGs</p>
            )}
          </button>
          <button disabled={loading} onClick={onClickTrigger} className="bg-blue w-48 h-12 p-3 rounded-xl" type="button">
            {loading ? (
              <CustomLoader size={20} contained={false} />
            ) : (
              <p>Trigger Ingestion</p>
            )}
          </button>
        </div>
        )}
      </div>

      <EPGValidationModal
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        validationResult={validationResult}
      />

      <ConfirmDeleteEPGModal
        isOpen={confirmModalOpen}
        onKeepConfirm={onKeepConfirm}
        onRemoveConfirm={onRemoveConfirm}
        loading={loading}
      />
    </>
  );
}
