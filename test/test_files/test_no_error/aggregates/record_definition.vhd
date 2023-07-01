library ieee;
use ieee.std_logic_1164.all;
package record_definition is
  type t_axi_stream is record
    tvalid : std_ulogic;
    tdata  : std_ulogic_vector;
    tstrb  : std_ulogic_vector;
    tkeep  : std_ulogic_vector;
    tlast  : std_ulogic;
    tid    : std_ulogic_vector;
    tdest  : std_ulogic_vector;
    tuser  : std_ulogic_vector;
  end record t_axi_stream;
end package;