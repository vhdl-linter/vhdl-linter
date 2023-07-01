library ieee;
use ieee.std_logic_1164.all;
entity record_aggregate_same_file is
end entity;
architecture arch of record_aggregate_same_file is
  constant DATA_WIDTH : integer := 8;
  type t_axi_stream is record
    tvalid : std_ulogic;                --! valid
    tdata  : std_ulogic_vector;  --! data, only complete bytes supported as bit width
    tstrb  : std_ulogic_vector;         --! data strobe
    tkeep  : std_ulogic_vector;         --! keep
    tlast  : std_ulogic;                --! last, indicate packet boundary
    tid    : std_ulogic_vector;  --! id to identify different data streams
    tdest  : std_ulogic_vector;  --! routing information for the data stream
    tuser  : std_ulogic_vector;         --! user sideband data
  end record t_axi_stream;
  signal foo : t_axi_stream(tdata(DATA_WIDTH - 1 downto 0), tkeep(DATA_WIDTH/8 -1 downto 0), tstrb(-1 downto 0), tid(-1 downto 0), tuser(-1 downto 0), tdest(0 downto 0));

begin
  foo <= (
    tdata  => x"AA",
    tvalid => '1',
    tstrb  => "",
    tkeep  => '1',
    tlast  => '1',
    tdest  => '0',
    tid    => "",
    tuser  => ""
    );
  assert true report to_string(foo.tdata);
end architecture;
