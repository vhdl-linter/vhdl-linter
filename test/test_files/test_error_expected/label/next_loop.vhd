package next_loop is
end package;
package body next_loop is
  procedure ReadSpecification is
  begin
    ReadLoop : loop
      next ReadLoop when does_not_exist; -- does not exist
    end loop;
  end procedure;
end package body;
