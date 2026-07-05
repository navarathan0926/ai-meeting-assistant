interface MeetingAudioPlayerProps {
  audioUrl: string;
  fileName?: string;
}

export function MeetingAudioPlayer({ audioUrl, fileName }: MeetingAudioPlayerProps) {
  return (
    <div className="sticky top-0 z-30 -mx-6 md:-mx-10 px-6 md:px-10 py-3 bg-[#09090f]/95 backdrop-blur border-b border-white/8">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls className="w-full" src={audioUrl} />
      {fileName && (
        <p className="text-xs text-white/40 mt-1 truncate">{fileName}</p>
      )}
    </div>
  );
}
