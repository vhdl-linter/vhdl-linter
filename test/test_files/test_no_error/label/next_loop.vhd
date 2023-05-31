package next_loop is

end package;
package body next_loop is
  procedure ReadSpecification is
    variable Empty : boolean; -- vhdl-linter-disable-line unused
  begin

     ReadLineLoop : while true loop
      ReadLoop : loop 
        next ReadLineLoop when Empty;
        next ReadLoop when Empty;
      end loop; 
    end loop;
  end procedure;
end package body;
  