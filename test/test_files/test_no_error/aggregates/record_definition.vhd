library ieee;
use ieee.std_logic_1164.all;
package record_definition is
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
end package;